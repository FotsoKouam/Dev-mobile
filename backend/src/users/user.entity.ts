import { Column, Entity, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../common/base.entity.js';
import { UserStatus } from './enums/user-status.enum.js';
import { AuthMethod } from './enums/auth-method.enum.js';
import { Assignment } from '../assignments/assignment.entity.js';

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string | null;

  @Column({ type: 'enum', enum: AuthMethod })
  authMethod: AuthMethod;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash?: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.INVITED })
  status: UserStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;

  @OneToMany(() => Assignment, (assignment) => assignment.user)
  assignments: Relation<Assignment[]>;
}
