import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IngestionService } from './ingestion.service.js';
import { DocumentFileType, DocumentStatus } from '../document.enums.js';

describe('IngestionService', () => {
  let service: IngestionService;
  let documentsRepo: any;
  let versionsRepo: any;
  let chunksRepo: any;
  let storageService: any;
  let documentStatusService: any;
  let ocrService: any;
  let segmentationService: any;
  let embeddingClient: any;
  let dataSource: any;
  let queryRunnerMock: any;
  let embedRunnerMock: any;

  const nativePdfBuffer = readFileSync(
    resolve(process.cwd(), 'test/fixtures/sample-native.pdf'),
  );
  const scannedPdfBuffer = readFileSync(
    resolve(process.cwd(), 'test/fixtures/sample-scanned.pdf'),
  );

  const mockVector = Array.from({ length: 768 }, () => 0.123);

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

    embeddingClient = {
      embedPassages: vi.fn().mockImplementation(async (texts: string[]) => {
        return texts.map(() => [...mockVector]);
      }),
    };

    queryRunnerMock = {
      connect: vi.fn().mockResolvedValue(undefined),
      startTransaction: vi.fn().mockResolvedValue(undefined),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
      manager: {
        delete: vi.fn().mockResolvedValue({}),
        create: vi.fn((entity, dto) => ({ id: 'chunk-uuid-1', ...dto })),
        save: vi.fn((entities) =>
          Promise.resolve(
            entities.map((e: any, idx: number) => ({ id: `chunk-uuid-${idx + 1}`, ...e })),
          ),
        ),
      },
      query: vi.fn().mockResolvedValue([]),
    };

    embedRunnerMock = {
      connect: vi.fn().mockResolvedValue(undefined),
      startTransaction: vi.fn().mockResolvedValue(undefined),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
    };

    let runnerCallCount = 0;
    dataSource = {
      createQueryRunner: vi.fn().mockImplementation(() => {
        runnerCallCount++;
        return runnerCallCount === 1 ? queryRunnerMock : embedRunnerMock;
      }),
    };

    service = new IngestionService(
      documentsRepo,
      versionsRepo,
      chunksRepo,
      storageService,
      documentStatusService,
      ocrService,
      segmentationService,
      embeddingClient,
      dataSource,
    );
  });

  it('enchaîne extraction -> segmentation -> indexing -> available et met à jour les vecteurs', async () => {
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

    // Transitions de statut ordonnées
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-1',
      DocumentStatus.SEGMENTATION,
    );
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-1',
      DocumentStatus.INDEXING,
    );
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-1',
      DocumentStatus.AVAILABLE,
    );

    // Vérifie que embeddingClient a bien été appelé avec les contenus
    expect(embeddingClient.embedPassages).toHaveBeenCalled();

    // Vérifie la mise à jour paramétrée UPDATE chunks SET embedding = $1 WHERE id = $2
    expect(embedRunnerMock.query).toHaveBeenCalledWith(
      'UPDATE chunks SET embedding = $1 WHERE id = $2',
      [expect.stringMatching(/^\[.*\]$/), expect.any(String)],
    );
    expect(embedRunnerMock.commitTransaction).toHaveBeenCalled();
  });

  it('passe en statut error avec message générique si le service d embeddings est indisponible', async () => {
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
    embeddingClient.embedPassages.mockRejectedValue(new Error('Service indisponible'));

    await expect(service.process('v-1')).rejects.toThrow();

    // Doit passer en error avec le message générique imposé
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-1',
      DocumentStatus.ERROR,
      "Le service d'indexation est indisponible.",
    );
    // Ne doit JAMAIS passer en available
    expect(documentStatusService.setStatus).not.toHaveBeenCalledWith(
      'doc-1',
      DocumentStatus.AVAILABLE,
    );
  });

  it('détecte un PDF sans texte comme scanned_pdf et enchaîne OCR puis segmentation puis indexing', async () => {
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

    expect(documentsRepo.update).toHaveBeenCalledWith('doc-scanned', {
      fileType: DocumentFileType.SCANNED_PDF,
    });
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-scanned',
      DocumentStatus.OCR,
    );
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-scanned',
      DocumentStatus.SEGMENTATION,
    );
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-scanned',
      DocumentStatus.INDEXING,
    );
    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-scanned',
      DocumentStatus.AVAILABLE,
    );
  });

  it('échoue avec statut error et message générique si la lecture du fichier échoue', async () => {
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

    expect(documentStatusService.setStatus).toHaveBeenCalledWith(
      'doc-err',
      DocumentStatus.ERROR,
      "Le service d'indexation est indisponible.",
    );
  });
});
