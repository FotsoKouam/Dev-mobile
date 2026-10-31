import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../common/base.entity.js';
import { AssignmentStatus } from './enums/assignment-status.enum.js';
import { User } from '../users/user.entity.js';
import { Role } from '../roles/role.entity.js';
import { School } from '../schools/school.entity.js';
import { Program } from '../programs/program.entity.js';

/**
 * Note sur l'unicité des affectations :
 * PostgreSQL ne considère pas deux NULLs comme égaux dans une contrainte UNIQUE classique,
 * ce qui laisserait passer des doublons quand schoolId ou programId sont nuls (ex. platform_admin).
 * L'index unique fonctionnel (avec COALESCE sur school_id et program_id)
 * "UQ_assignments_unique_assignment" est défini directement dans la migration
 * (1793100000000-UsersRolesAssignments.ts) car TypeORM ne sait pas décrire
 * d'index avec expressions/fonctions COALESCE au niveau décorateur d'entité.
 * On ne met donc pas de décorateur @Unique ici pour éviter que TypeORM ne veuille
 * le remplacer par une contrainte UNIQUE classique lors de migration:generate.
 */
@Entity('assignments')
export class Assignment extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.assignments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_assignments_user_id',
  })
  user: Relation<User>;

  @Column({ type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'role_id',
    foreignKeyConstraintName: 'FK_assignments_role_id',
  })
  role: Relation<Role>;

  @Column({ type: 'uuid', nullable: true })
  schoolId?: string | null;

  @ManyToOne(() => School, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({
    name: 'school_id',
    foreignKeyConstraintName: 'FK_assignments_school_id',
  })
  school: Relation<School | null>;

  @Column({ type: 'uuid', nullable: true })
  programId?: string | null;

  @ManyToOne(() => Program, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({
    name: 'program_id',
    foreignKeyConstraintName: 'FK_assignments_program_id',
  })
  program: Relation<Program | null>;

  @Column({ type: 'enum', enum: AssignmentStatus, default: AssignmentStatus.ACTIVE })
  status: AssignmentStatus;
}
