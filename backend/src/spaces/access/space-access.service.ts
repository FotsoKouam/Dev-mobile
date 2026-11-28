import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Space } from '../space.entity.js';
import { SpaceScope, SpaceStatus } from '../space.enums.js';
import { SpaceMember } from '../space-member.entity.js';
import { Assignment } from '../../assignments/assignment.entity.js';
import { AssignmentStatus } from '../../assignments/enums/assignment-status.enum.js';
import { User } from '../../users/user.entity.js';
import { UserStatus } from '../../users/enums/user-status.enum.js';

export interface SpaceAccessUser {
  id: string;
  isPlatformAdmin: boolean;
}

@Injectable()
export class SpaceAccessService {
  constructor(
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(SpaceMember)
    private readonly spaceMembersRepository: Repository<SpaceMember>,
  ) {}

  /**
   * Calcule la liste des identifiants d'espaces (space_id) auxquels un utilisateur a accès.
   * Règle unique et obligatoire pour tout filtre en amont d'une recherche documentaire / RAG.
   *
   * Règle d'accès (ADR 0003) :
   * - Espace actif (status = 'active')
   * - Compte utilisateur existant et non suspendu/inactif (status = 'active' ou 'invited')
   * - Platform Admin : accès à tous les espaces actifs (décision ADR 0003 : le platform_admin
   *   n'est pas soumis aux restrictions d'école/filière/rôle).
   * - Utilisateur standard : accès si au moins une condition est satisfaite :
   *   1. Portée école : affectation active dans l'école de l'espace (scope = 'school' AND assignment.schoolId = space.schoolId)
   *   2. Portée filière : affectation active sur la filière de l'espace (scope = 'program' AND assignment.programId = space.scopeProgramId)
   *   3. Portée rôle : affectation active avec le rôle dans l'école de l'espace (scope = 'role' AND assignment.schoolId = space.schoolId AND role.code = space.scopeRoleCode)
   *   4. Membre explicite : ligne dans space_members pour cet utilisateur et cet espace.
   *
   * Note convention : noms de propriétés d'entité utilisés dans le QueryBuilder TypeORM.
   */
  async getAccessibleSpaceIds(user: SpaceAccessUser): Promise<string[]> {
    if (!user || !user.id) {
      return [];
    }

    // Vérifier l'état du compte dans la table users
    const dbUser = await this.usersRepository.findOne({
      where: { id: user.id },
      select: ['id', 'status'],
    });

    if (!dbUser) {
      return [];
    }

    // Un utilisateur suspendu ou inactif n'a accès à aucun espace
    if (dbUser.status === UserStatus.SUSPENDED || dbUser.status === UserStatus.INACTIVE) {
      return [];
    }

    // Décision ADR 0003 : platform_admin voit tous les espaces actifs
    if (user.isPlatformAdmin) {
      const allActiveSpaces = await this.spacesRepository.find({
        where: { status: SpaceStatus.ACTIVE },
        select: ['id'],
      });
      return allActiveSpaces.map((s) => s.id);
    }

    // Récupérer les espaces accessibles via une requête TypeORM unique avec EXISTS
    const qb = this.spacesRepository
      .createQueryBuilder('space')
      .select('space.id')
      .where('space.status = :activeStatus', { activeStatus: SpaceStatus.ACTIVE })
      .andWhere(
        `((EXISTS (
            SELECT 1 FROM assignments assignment
            LEFT JOIN roles role ON role.id = assignment.role_id
            WHERE assignment.user_id = :userId
              AND assignment.status = :assignmentActiveStatus
              AND (
                (space.scope = :scopeSchool AND assignment.school_id = space.school_id)
                OR (space.scope = :scopeProgram AND assignment.program_id = space.scope_program_id)
                OR (space.scope = :scopeRole AND assignment.school_id = space.school_id AND role.code = space.scope_role_code)
              )
          ))
          OR (EXISTS (
            SELECT 1 FROM space_members member
            WHERE member.space_id = space.id
              AND member.user_id = :userId
          )))`,
        {
          userId: user.id,
          assignmentActiveStatus: AssignmentStatus.ACTIVE,
          scopeSchool: SpaceScope.SCHOOL,
          scopeProgram: SpaceScope.PROGRAM,
          scopeRole: SpaceScope.ROLE,
        },
      );

    const spaces = await qb.getMany();
    // Retourner un tableau d'identifiants sans doublons
    return Array.from(new Set(spaces.map((s) => s.id)));
  }
}
