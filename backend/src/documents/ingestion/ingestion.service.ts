import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { extname } from 'node:path';
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
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Traite l'ingestion d'une version de document pour générer les passages (chunks).
   *
   * Transitions de statut :
   * pending -> (ocr si besoin) -> segmentation -> available
   * En cas d'échec : error avec message générique (sans chemin ni trace).
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

      if (isImage) {
        // Traitement image : OCR
        await this.documentStatusService.setStatus(doc.id, DocumentStatus.OCR);
        const absolutePath = this.storageService.getAbsolutePath(version.storageKey);
        const ocrText = await this.ocrService.extractText(absolutePath);
        pages = [{ pageNumber: 1, text: ocrText }];
        source = ChunkSource.OCR;
      } else {
        // Extraction native PDF
        const extracted = await this.extractNativePdfPages(buffer);
        const totalPages = extracted.length || 1;
        const totalChars = extracted.reduce((sum, p) => sum + (p.text ? p.text.trim().length : 0), 0);
        const avgCharsPerPage = totalChars / totalPages;

        if (avgCharsPerPage < 20) {
          // Détection d'un PDF scanné : moins de 20 caractères par page en moyenne
          this.logger.log(
            `Document ${doc.id} détecté comme PDF scanné (moyenne ${avgCharsPerPage.toFixed(1)} car./page). Passage à l OCR.`,
          );
          // Mettre à jour le type en base
          await this.documentsRepository.update(doc.id, {
            fileType: DocumentFileType.SCANNED_PDF,
          });
          doc.fileType = DocumentFileType.SCANNED_PDF;

          // Passage au statut OCR
          await this.documentStatusService.setStatus(doc.id, DocumentStatus.OCR);
          const absolutePath = this.storageService.getAbsolutePath(version.storageKey);
          const ocrText = await this.ocrService.extractText(absolutePath);
          pages = [{ pageNumber: 1, text: ocrText }];
          source = ChunkSource.OCR;
        } else {
          pages = extracted;
          source = ChunkSource.NATIVE;
        }
      }

      // Étape de segmentation
      await this.documentStatusService.setStatus(doc.id, DocumentStatus.SEGMENTATION);
      const segmentedItems = this.segmentationService.segment(pages, 800, 100);

      // Remplacement en bloc dans une transaction (suppression puis insertion)
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
            }),
          );

          await queryRunner.manager.save(chunkEntities);
        }

        await queryRunner.commitTransaction();
      } catch (dbErr) {
        await queryRunner.rollbackTransaction();
        throw dbErr;
      } finally {
        await queryRunner.release();
      }

      // Transition finale vers available
      await this.documentStatusService.setStatus(doc.id, DocumentStatus.AVAILABLE);
    } catch (err: any) {
      this.logger.error(
        `Erreur lors de l ingestion de la version ${documentVersionId}: ${err?.message}`,
      );
      // Positionner le statut error avec un message générique sans chemin ni stack trace
      await this.documentStatusService.setStatus(
        doc.id,
        DocumentStatus.ERROR,
        'Une erreur est survenue lors de l extraction et du traitement du document.',
      );
      throw err;
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
