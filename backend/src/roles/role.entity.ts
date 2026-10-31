import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity.js';
import { RoleCode } from './enums/role-code.enum.js';
import { RoleStatus } from './enums/role-status.enum.js';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ type: 'enum', enum: RoleCode, unique: true })
  code: RoleCode;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ type: 'enum', enum: RoleStatus, default: RoleStatus.ACTIVE })
  status: RoleStatus;

  /**
   * Les permissions sont chargées depuis la table `role_permissions`
   * par le service (pas de @OneToMany ici, car Permission n'est pas une entité).
   * Ce champ est peuplé à la main après la requête.
   */
  permissions?: string[];

  /**
   * Nombre d'utilisateurs ayant ce rôle via une affectation active.
   * Calculé par le service via sous-requête.
   */
  usersCount?: number;
}
