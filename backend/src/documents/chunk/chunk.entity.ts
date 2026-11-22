import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../common/base.entity.js';
import { DocumentVersion } from '../document-version.entity.js';
import { ChunkSource } from './chunk.enums.js';

@Entity('chunks')
@Unique(['documentVersionId', 'chunkIndex'])
export class Chunk extends BaseEntity {
  @Column({ type: 'uuid' })
  documentVersionId: string;

  @ManyToOne(() => DocumentVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_version_id' })
  documentVersion: Relation<DocumentVersion>;

  @Column({ type: 'int' })
  pageNumber: number;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 10 })
  source: ChunkSource;

  @Column({ type: 'text', nullable: true, select: false })
  embedding?: string | null;
}
