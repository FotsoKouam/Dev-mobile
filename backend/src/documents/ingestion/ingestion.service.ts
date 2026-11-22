import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { extname } from 'node:path';
import { promises as fs } from 'node:fs';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { Document } from '../document.entity.js';
import { DocumentVersion } from '../document-version.entity.js';
import { Chunk } from '../chunk/chunk.entity.js';
import { ChunkSource } from '../chunk/chunk.enums.js';
import { DocumentFileType, DocumentStatus } from '../document.enums.js';
import { StorageService } from '../storage/storage.service.js';
import { DocumentStatusService } from '../document-status.service.js';
import { OcrService } from './ocr.service.js';
import { SegmentationService } from './segmentation.service.js';
import { EmbeddingClient } from './embedding.client.js';
import { PdfRasterizer } from './pdf-rasterizer.service.js';
import { PdfRepairService } from './pdf-repair.service.js';
import { OfficeExtractorService } from './office-extractor.service.js';

export interface PageExtracted {
  pageNumber: number;
  text: string;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentsRepository: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionsRepository: Repository<DocumentVersion>,
    @InjectRepository(Chunk)
    private readonly chunksRepository: Repository<Chunk>,
    private readonly storageService: StorageService,
    private readonly documentStatusService: DocumentStatusService,
    private readonly ocrService: OcrService,
    private readonly segmentationService: SegmentationService,
    private readonly embeddingClient: EmbeddingClient,
    private readonly pdfRasterizer: PdfRasterizer,
    private readonly pdfRepairService: PdfRepairService,
    private readonly officeExtractorService: OfficeExtractorService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Traite l'ingestion d'une version de document pour générer les passages (chunks) et leurs embeddings.
   *
   * Enchaînement : extraction/OCR -> segmentation -> indexing (embeddings) -> available.
   * En cas d'échec : error avec message générique adapté, cause réelle logguée.
   */
  async process(documentVersionId: string): Promise<void> {
    const version = await this.versionsRepository.findOne({
      where: { id: documentVersionId },
      relations: ['document'],
    });

    if (!version) {
      throw new Error(`Version ${documentVersionId} introuvable pour l ingestion`);
    }

    const doc = version.document;
    if (!doc) {
      throw new Error(`Document associé à la version ${documentVersionId} introuvable`);
    }

    try {
      const buffer = this.storageService.readFile(version.storageKey);
      const ext = extname(version.originalFilename || version.storageKey).toLowerCase();

      let pages: PageExtracted[] = [];
      let source: ChunkSource = ChunkSource.NATIVE;

      // Traitement selon le type de fichier
      const isImage =
        doc.fileType === DocumentFileType.IMAGE ||
        ['.png', '.jpg', '.jpeg', '.heic'].includes(ext);

      const isDocx =
        doc.fileType === DocumentFileType.DOCX || ext === '.docx';

      const isPptx =
        doc.fileType === DocumentFileType.PPTX || ext === '.pptx';

      if (isImage) {
        // Traitement image : OCR direct (image passée à Tesseract)
        await this.documentStatusService.setStatus(doc.id, DocumentStatus.OCR);
        const absolutePath = this.storageService.getAbsolutePath(version.storageKey);
        const ocrText = await this.ocrService.extractText(absolutePath);
        pages = [{ pageNumber: 1, text: ocrText }];
        source = ChunkSource.OCR;
      } else if (isDocx) {
        // Traitement Word (.docx)
        pages = await this.officeExtractorService.extractDocx(buffer);
        source = ChunkSource.NATIVE;
      } else if (isPptx) {
        // Traitement PowerPoint (.pptx)
        pages = await this.officeExtractorService.extractPptx(buffer);
        source = ChunkSource.NATIVE;
      } else {
        // Traitement PDF (natif, scanné, ou réparé)
        const pdfResult = await this.processPdf(doc, version, buffer);
        pages = pdfResult.pages;
        source = pdfResult.source;
      }

      // Étape de segmentation
      await this.documentStatusService.setStatus(doc.id, DocumentStatus.SEGMENTATION);
      const segmentedItems = this.segmentationService.segment(pages, 800, 100);

      // Remplacement en bloc dans une transaction (suppression puis insertion des chunks sans vecteur)
      let savedChunks: Chunk[] = [];
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await queryRunner.manager.delete(Chunk, {
          documentVersionId: version.id,
        });

        if (segmentedItems.length > 0) {
          const chunkEntities = segmentedItems.map((item, index) =>
            queryRunner.manager.create(Chunk, {
              documentVersionId: version.id,
              pageNumber: item.pageNumber,
              chunkIndex: index,
              content: item.content,
              source,
              embedding: null,
            }),
          );

          savedChunks = await queryRunner.manager.save(chunkEntities);
        }

        await queryRunner.commitTransaction();
      } catch (dbErr) {
        await queryRunner.rollbackTransaction();
        throw dbErr;
      } finally {
        await queryRunner.release();
      }

      // Étape d'indexation (vectorisation pgvector)
      if (savedChunks.length > 0) {
        await this.documentStatusService.setStatus(doc.id, DocumentStatus.INDEXING);

        const textsToEmbed = savedChunks.map((c) => c.content);
        const embeddings = await this.embeddingClient.embedPassages(textsToEmbed);

        if (embeddings.length !== savedChunks.length) {
          throw new Error("Nombre d'embeddings incomplet reçu du service");
        }

        // Mise à jour par lot dans une transaction : UPDATE chunks SET embedding = $1 WHERE id = $2
        const embedRunner = this.dataSource.createQueryRunner();
        await embedRunner.connect();
        await embedRunner.startTransaction();

        try {
          for (let i = 0; i < savedChunks.length; i++) {
            const chunkId = savedChunks[i].id;
            const vectorString = `[${embeddings[i].join(',')}]`;
            await embedRunner.query(
              `UPDATE chunks SET embedding = $1 WHERE id = $2`,
              [vectorString, chunkId],
            );
          }
          await embedRunner.commitTransaction();
        } catch (embedDbErr) {
          await embedRunner.rollbackTransaction();
          throw embedDbErr;
        } finally {
          await embedRunner.release();
        }
      }

      // Transition finale vers available seulement si tout s'est bien déroulé
      await this.documentStatusService.setStatus(doc.id, DocumentStatus.AVAILABLE);
    } catch (err: any) {
      this.logger.error(
        `Erreur lors de l ingestion de la version ${documentVersionId}: ${err?.message}`,
        err?.stack,
      );

      // Si l'erreur est liée à un PDF corrompu
      if (err?.isCorruptPdf) {
        await this.documentStatusService.setStatus(
          doc.id,
          DocumentStatus.ERROR,
          'Fichier PDF invalide ou corrompu.',
        );
      } else {
        await this.documentStatusService.setStatus(
          doc.id,
          DocumentStatus.ERROR,
          "Le service d'indexation est indisponible.",
        );
      }
      throw err;
    }
  }

  /**
   * Traitement d'un PDF : extraction native, tentative de réparation si corrompu,
   * ou conversion en PNG page par page via pdftoppm puis OCR Tesseract si scanné.
   */
  private async processPdf(
    doc: Document,
    version: DocumentVersion,
    initialBuffer: Buffer,
  ): Promise<{ pages: PageExtracted[]; source: ChunkSource }> {
    let currentBuffer = initialBuffer;
    let absolutePath = this.storageService.getAbsolutePath(version.storageKey);
    let extracted: PageExtracted[] | null = null;
    let isCorrupted = false;

    // 1. Tenter l'extraction native
    try {
      extracted = await this.extractNativePdfPages(currentBuffer);
    } catch (parseErr: any) {
      this.logger.warn(
        `Erreur ouverture PDF pour doc ${doc.id} (possible corruption): ${parseErr?.message}`,
      );
      isCorrupted = true;
    }

    // 2. Si échec de structure (corrompu), tenter une réparation via qpdf --repair
    if (isCorrupted || !extracted) {
      const repairTempDir = await this.pdfRepairService.createTempDir(doc.id);
      try {
        let repairedPath: string | null = null;
        try {
          repairedPath = await this.pdfRepairService.repairPdf(absolutePath, repairTempDir);
        } catch {
          repairedPath = null;
        }

        if (!repairedPath) {
          const corruptErr: any = new Error(`Échec de la réparation qpdf pour le PDF ${doc.id}`);
          corruptErr.isCorruptPdf = true;
          throw corruptErr;
        }

        // Lire le fichier réparé
        currentBuffer = await fs.readFile(repairedPath);
        absolutePath = repairedPath;

        // Ré-essayer l'extraction native sur le fichier réparé
        try {
          extracted = await this.extractNativePdfPages(currentBuffer);
        } catch (reExtractErr: any) {
          this.logger.error(
            `Échec de l extraction après réparation pour le PDF ${doc.id}: ${reExtractErr?.message}`,
          );
          const corruptErr: any = new Error('PDF invalide même après tentative de réparation');
          corruptErr.isCorruptPdf = true;
          throw corruptErr;
        }
      } finally {
        await this.pdfRepairService.removeTempDir(repairTempDir);
      }
    }

    const totalPages = extracted.length || 1;
    const totalChars = extracted.reduce((sum, p) => sum + (p.text ? p.text.trim().length : 0), 0);
    const avgCharsPerPage = totalChars / totalPages;

    // 3. Si le texte extrait est suffisant (>= 20 car./page) -> PDF natif
    if (avgCharsPerPage >= 20) {
      return { pages: extracted, source: ChunkSource.NATIVE };
    }

    // 4. Moins de 20 car./page -> PDF scanné : conversion page par page avec pdftoppm puis OCR
    this.logger.log(
      `Document ${doc.id} détecté comme PDF scanné (moyenne ${avgCharsPerPage.toFixed(1)} car./page). Conversion et passage à l OCR page par page.`,
    );

    await this.documentsRepository.update(doc.id, {
      fileType: DocumentFileType.SCANNED_PDF,
    });
    doc.fileType = DocumentFileType.SCANNED_PDF;

    await this.documentStatusService.setStatus(doc.id, DocumentStatus.OCR);

    const rasterDir = await this.pdfRasterizer.createTempDir(doc.id);
    try {
      // Convertir en PNG à 300 DPI (ne jamais passer le PDF directement à Tesseract)
      const pngPages = await this.pdfRasterizer.rasterizeToPng(absolutePath, rasterDir);

      if (pngPages.length === 0) {
        throw new Error('Aucune page convertie depuis le PDF scanné');
      }

      const ocrPages: PageExtracted[] = [];

      for (let i = 0; i < pngPages.length; i++) {
        const pagePngPath = pngPages[i];
        // OCR sur l'image de la page
        const pageText = await this.ocrService.extractText(pagePngPath);
        ocrPages.push({
          pageNumber: i + 1,
          text: pageText,
        });
      }

      return { pages: ocrPages, source: ChunkSource.OCR };
    } finally {
      // Nettoyage impératif des images temporaires
      await this.pdfRasterizer.removeTempDir(rasterDir);
    }
  }

  /**
   * Extrait le texte d'un PDF page par page à l'aide de pdf-parse.
   */
  private async extractNativePdfPages(buffer: Buffer): Promise<PageExtracted[]> {
    const pages: PageExtracted[] = [];

    await pdfParse(buffer, {
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          let lastY: any;
          let text = '';
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }
          pages.push({
            pageNumber: pageData.pageIndex + 1,
            text: text.trim(),
          });
          return text;
        });
      },
    });

    return pages;
  }
}
