import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../common/base.entity.js';
import { SpaceScope, SpaceStatus } from './space.enums.js';
import { School } from '../schools/school.entity.js';
import { Program } from '../programs/program.entity.js';
import { SpaceMember } from './space-member.entity.js';

@Entity('spaces')
@Unique(['schoolId', 'name'])
export class Space extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'school_id' })
  school: Relation<School>;

  @Column({
    type: 'varchar',
    length: 20,
  })
  scope: SpaceScope;

  @Column({ type: 'uuid', nullable: true })
  scopeProgramId?: string | null;

  @ManyToOne(() => Program, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'scope_program_id' })
  scopeProgram: Relation<Program | null>;

  @Column({ type: 'varchar', length: 20, nullable: true })
  scopeRoleCode?: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: SpaceStatus.ACTIVE,
  })
  status: SpaceStatus;

  @OneToMany(() => SpaceMember, (member) => member.space)
  members: Relation<SpaceMember[]>;
}
