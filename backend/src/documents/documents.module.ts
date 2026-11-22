import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './document.entity.js';
import { DocumentVersion } from './document-version.entity.js';
import { Chunk } from './chunk/chunk.entity.js';
import { Space } from '../spaces/space.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { AuditLog } from '../audit/audit-log.entity.js';
import { StorageService } from './storage/storage.service.js';
import { DocumentsService } from './documents.service.js';
import { DocumentStatusService } from './document-status.service.js';
import { DocumentsController } from './documents.controller.js';
import { OcrService } from './ingestion/ocr.service.js';
import { SegmentationService } from './ingestion/segmentation.service.js';
import { EmbeddingClient } from './ingestion/embedding.client.js';
import { IngestionService } from './ingestion/ingestion.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentVersion,
      Chunk,
      Space,
      Assignment,
      AuditLog,
    ]),
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentStatusService,
    StorageService,
    OcrService,
    SegmentationService,
    EmbeddingClient,
    IngestionService,
  ],
  exports: [
    DocumentsService,
    DocumentStatusService,
    StorageService,
    EmbeddingClient,
    IngestionService,
  ],
})
export class DocumentsModule {}
