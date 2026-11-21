import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity.js';
import { DocumentStatus } from './document.enums.js';

@Injectable()
export class DocumentStatusService {
  constructor(
    @InjectRepository(Document)
    private readonly documentsRepository: Repository<Document>,
  ) {}

  /**
   * Applique une transition de statut sur un document en validant les transitions autorisées.
   *
   * Transitions autorisées :
   * - pending -> ocr, segmentation, available, error
   * - ocr -> segmentation, error
   * - segmentation -> available, error
   * - indexing -> available, error
   * - available -> error
   * - error -> pending
   */
  async setStatus(
    documentId: string,
    newStatus: DocumentStatus,
    errorMessage?: string | null,
  ): Promise<Document> {
    const doc = await this.documentsRepository.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException('Document introuvable');
    }

    const currentStatus = doc.status;

    const allowedMap: Record<DocumentStatus, DocumentStatus[]> = {
      [DocumentStatus.PENDING]: [
        DocumentStatus.OCR,
        DocumentStatus.SEGMENTATION,
        DocumentStatus.AVAILABLE,
        DocumentStatus.ERROR,
      ],
      [DocumentStatus.OCR]: [DocumentStatus.SEGMENTATION, DocumentStatus.ERROR],
      [DocumentStatus.SEGMENTATION]: [
        DocumentStatus.AVAILABLE,
        DocumentStatus.ERROR,
      ],
      [DocumentStatus.INDEXING]: [
        DocumentStatus.AVAILABLE,
        DocumentStatus.ERROR,
      ],
      [DocumentStatus.AVAILABLE]: [DocumentStatus.ERROR],
      [DocumentStatus.ERROR]: [DocumentStatus.PENDING],
    };

    const isAllowed = allowedMap[currentStatus]?.includes(newStatus);

    if (!isAllowed) {
      throw new BadRequestException(
        `Transition de statut non autorisée : impossible de passer de '${currentStatus}' à '${newStatus}'`,
      );
    }

    doc.status = newStatus;
    doc.errorMessage = newStatus === DocumentStatus.ERROR ? (errorMessage || null) : null;
    return this.documentsRepository.save(doc);
  }
}
