import { Column, Entity, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../common/base.entity.js';
import { SchoolType } from './enums/school-type.enum.js';
import { SchoolStatus } from './enums/school-status.enum.js';
import { Program } from '../programs/program.entity.js';

@Entity('schools')
export class School extends BaseEntity {
  @Column({ type: 'varchar', length: 150, unique: true })
  name: string;

  @Column({ type: 'enum', enum: SchoolType })
  type: SchoolType;

  @Column({ type: 'varchar', length: 150 })
  city: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  googleWorkspaceDomain?: string | null;

  @Column({ type: 'varchar', length: 10, default: 'fr' })
  mainLanguage: string;

  @Column({ type: 'enum', enum: SchoolStatus, default: SchoolStatus.ACTIVE })
  status: SchoolStatus;

  @OneToMany(() => Program, (program) => program.school)
  programs: Relation<Program[]>;

  programsCount?: number;
}
