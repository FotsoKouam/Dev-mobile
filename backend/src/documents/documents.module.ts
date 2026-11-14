import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './document.entity.js';
import { DocumentVersion } from './document-version.entity.js';
import { Space } from '../spaces/space.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { StorageService } from './storage/storage.service.js';
import { DocumentsService } from './documents.service.js';
import { DocumentsController } from './documents.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentVersion, Space, Assignment]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService],
  exports: [DocumentsService, StorageService],
})
export class DocumentsModule {}
