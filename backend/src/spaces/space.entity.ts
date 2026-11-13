import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../common/base.entity.js';
import { SpaceStatus, SpaceType } from './space.enums.js';
import { Program } from '../programs/program.entity.js';
import { User } from '../users/user.entity.js';

@Entity('spaces')
@Unique(['programId', 'name'])
export class Space extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: SpaceType.INSTITUTIONAL,
  })
  type: SpaceType;

  @Column({ type: 'uuid', nullable: true })
  programId?: string | null;

  @ManyToOne(() => Program, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'program_id' })
  program: Relation<Program | null>;

  @Column({ type: 'uuid', nullable: true })
  ownerId?: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: Relation<User | null>;

  @Column({
    type: 'varchar',
    length: 20,
    default: SpaceStatus.ACTIVE,
  })
  status: SpaceStatus;
}

