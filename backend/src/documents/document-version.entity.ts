import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../common/base.entity.js';
import { Document } from './document.entity.js';
import { User } from '../users/user.entity.js';

@Entity('document_versions')
@Unique(['documentId', 'versionNumber'])
export class DocumentVersion extends BaseEntity {
  @Column({ type: 'uuid' })
  documentId: string;

  @ManyToOne(() => Document, (doc) => doc.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Relation<Document>;

  @Column({ type: 'int' })
  versionNumber: number;

  @Column({ type: 'varchar', length: 255 })
  storageKey: string;

  @Column({ type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column({ type: 'varchar', length: 64 })
  checksumSha256: string;

  @Column({ type: 'uuid' })
  uploadedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: Relation<User>;
}
