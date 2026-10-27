import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../common/base.entity.js';
import { ProgramStatus } from './enums/program-status.enum.js';
import { School } from '../schools/school.entity.js';

@Entity('programs')
@Unique(['schoolId', 'name'])
export class Program extends BaseEntity {
  @Column({ type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School, (school) => school.programs, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'school_id' })
  school: Relation<School>;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'enum', enum: ProgramStatus, default: ProgramStatus.ACTIVE })
  status: ProgramStatus;
}
