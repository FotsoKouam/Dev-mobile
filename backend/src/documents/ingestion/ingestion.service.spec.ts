import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IngestionService } from './ingestion.service.js';
import { DocumentFileType, DocumentStatus } from '../document.enums.js';
import { ChunkSource } from '../chunk/chunk.enums.js';
import { Chunk } from '../chunk/chunk.entity.js';

describe('IngestionService', () => {
  let service: IngestionService;
  let documentsRepo: any;
  let versionsRepo: any;
  let chunksRepo: any;
  let storageService: any;
  let documentStatusService: any;
  let ocrService: any;
  let segmentationService: any;
  let dataSource: any;
  let queryRunnerMock: any;

  const nativePdfBuffer = readFileSync(
    resolve(process.cwd(), 'test/fixtures/sample-native.pdf'),
  );
  const scannedPdfBuffer = readFileSync(
    resolve(process.cwd(), 'test/fixtures/sample-scanned.pdf'),
  );

  beforeEach(() => {
    documentsRepo = {
      update: vi.fn().mockResolvedValue({}),
      save: vi.fn((entity) => Promise.resolve(entity)),
    };

    versionsRepo = {
      findOne: vi.fn(),
    };

    chunksRepo = {
      delete: vi.fn().mockResolvedValue({}),
      save: vi.fn((entity) => Promise.resolve(entity)),
      create: vi.fn((dto) => dto),
    };

    storageService = {
      readFile: vi.fn(),
      getAbsolutePath: vi.fn((key: string) => `/mock/path/${key}`),
    };

    documentStatusService = {
      setStatus: vi.fn().mockResolvedValue({}),
    };

    ocrService = {
      extractText: vi.fn().mockResolvedValue('Texte extrait via Tesseract OCR.'),
    };

    segmentationService = {
      segment: vi.fn((pages: any[]) =>
        pages.map((p) => ({
          pageNumber: p.pageNumber,
          content: p.text,
        })),
      ),
    };

    queryRunnerMock = {
      connect: vi.fn().mockResolvedValue(undefined),
      startTransaction: vi.fn().mockResolvedValue(undefined),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
      manager: {
        delete: vi.fn().mockResolvedValue({}),
        create: vi.fn((entity, dto) => dto),
        save: vi.fn((entities) => Promise.resolve(entities)),
      },
    };

    dataSource = {
      createQueryRunner: vi.fn().mockReturnValue(queryRunnerMock),
    };

    service = new IngestionService(
      documentsRepo,
      versionsRepo,
      chunksRepo,
      storageService,
      documentStatusService,
      ocrService,
      segmentationService,
      dataSource,
    );
  });

  it('traite un fichier PDF natif : extraction, chunks, page et index corrects, source = native', async () => {
    const versionMock = {
      id: 'v-1',
      storageKey: 'v-1.pdf',
      originalFilename: 'sample-native.pdf',
      documentId: 'doc-1',
      document: {
        id: 'doc-1',
        fileType: DocumentFileType.PDF,
        status: DocumentStatus.PENDING,
      },
    };
    versionsRepo.findOne.mockResolvedValue(versionMock);
    storageService.readFile.mockReturnValue(nativePdfBuffer);

    await service.process('v-1');

    // Vérifie que l'OCR n'a pas été appelé pour du PDF natif
    expect(ocrService.extractText).not.toHaveBeenCalled();

    // Vérifie les transitions de statut
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-1',
      DocumentStatus.SEGMENTATION,
    );
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-1',
      DocumentStatus.AVAILABLE,
    );

    // Vérifie la persistance des chunks
    expect(queryRunnerMock.manager.delete).toHaveBeenCalledWith(Chunk, {
      documentVersionId: 'v-1',
    });
    expect(queryRunnerMock.manager.save).toHaveBeenCalled();
    const savedChunks = queryRunnerMock.manager.save.mock.calls[0][0];
    expect(savedChunks.length).toBeGreaterThan(0);
    expect(savedChunks[0].source).toBe(ChunkSource.NATIVE);
    expect(savedChunks[0].pageNumber).toBe(1);
    expect(savedChunks[0].chunkIndex).toBe(0);
  });

  it('détecte un PDF sans texte comme scanned_pdf et appelle OcrService mocké', async () => {
    const versionMock = {
      id: 'v-scanned',
      storageKey: 'v-scanned.pdf',
      originalFilename: 'scanned.pdf',
      documentId: 'doc-scanned',
      document: {
        id: 'doc-scanned',
        fileType: DocumentFileType.PDF,
        status: DocumentStatus.PENDING,
      },
    };
    versionsRepo.findOne.mockResolvedValue(versionMock);
    storageService.readFile.mockReturnValue(scannedPdfBuffer);
    ocrService.extractText.mockResolvedValue('Contenu OCR scanné');

    await service.process('v-scanned');

    // Vérifie que le type a été mis à jour vers scanned_pdf
    expect(documentsRepo.update).toHaveBeenCalledWith('doc-scanned', {
      fileType: DocumentFileType.SCANNED_PDF,
    });

    // Vérifie le passage à ocr puis segmentation puis available
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-scanned',
      DocumentStatus.OCR,
    );
    expect(ocrService.extractText).toHaveBeenCalledWith('/mock/path/v-scanned.pdf');
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-scanned',
      DocumentStatus.SEGMENTATION,
    );
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-scanned',
      DocumentStatus.AVAILABLE,
    );

    const savedChunks = queryRunnerMock.manager.save.mock.calls[0][0];
    expect(savedChunks[0].source).toBe(ChunkSource.OCR);
  });

  it('traite une image directement avec l OCR', async () => {
    const versionMock = {
      id: 'v-img',
      storageKey: 'v-img.png',
      originalFilename: 'photo.png',
      documentId: 'doc-img',
      document: {
        id: 'doc-img',
        fileType: DocumentFileType.IMAGE,
        status: DocumentStatus.PENDING,
      },
    };
    versionsRepo.findOne.mockResolvedValue(versionMock);
    storageService.readFile.mockReturnValue(Buffer.from('fake-png-bytes'));

    await service.process('v-img');

    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-img',
      DocumentStatus.OCR,
    );
    expect(ocrService.extractText).toHaveBeenCalledWith('/mock/path/v-img.png');
    const savedChunks = queryRunnerMock.manager.save.mock.calls[0][0];
    expect(savedChunks[0].source).toBe(ChunkSource.OCR);
  });

  it('passe le statut en error avec un message générique si l extraction échoue', async () => {
    const versionMock = {
      id: 'v-err',
      storageKey: 'v-err.pdf',
      originalFilename: 'corrupt.pdf',
      documentId: 'doc-err',
      document: {
        id: 'doc-err',
        fileType: DocumentFileType.PDF,
        status: DocumentStatus.PENDING,
      },
    };
    versionsRepo.findOne.mockResolvedValue(versionMock);
    storageService.readFile.mockImplementation(() => {
      throw new Error('/secret/path/disk/crash');
    });

    await expect(service.process('v-err')).rejects.toThrow();

    // Vérifie que le statut error a été posé avec un message générique ne contenant pas le chemin
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-err',
      DocumentStatus.ERROR,
      'Une erreur est survenue lors de l extraction et du traitement du document.',
    );
  });
});
