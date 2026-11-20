import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../common/base.entity.js';
import { DocumentFileType, DocumentStatus } from './document.enums.js';
import { Space } from '../spaces/space.entity.js';
import { User } from '../users/user.entity.js';
import { DocumentVersion } from './document-version.entity.js';

@Entity('documents')
export class Document extends BaseEntity {
  @Column({ type: 'uuid' })
  spaceId: string;

  @ManyToOne(() => Space, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'space_id' })
  space: Relation<Space>;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  fileType: DocumentFileType;

  @Column({
    type: 'varchar',
    length: 20,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage?: string | null;

  @Column({ type: 'uuid', nullable: true })
  currentVersionId?: string | null;

  @ManyToOne(() => DocumentVersion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'current_version_id' })
  currentVersion?: Relation<DocumentVersion | null>;

  @Column({ type: 'uuid' })
  uploadedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: Relation<User>;

  @OneToMany(() => DocumentVersion, (v) => v.document)
  versions: Relation<DocumentVersion[]>;
}
