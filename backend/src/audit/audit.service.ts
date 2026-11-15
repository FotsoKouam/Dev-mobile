import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { AssignmentStatus } from '../assignments/enums/assignment-status.enum.js';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { QueryAuditLogDto, QueryAuditStatsDto } from './dto/query-audit-log.dto.js';
import { AuditLogResponseDto } from './dto/audit-log-response.dto.js';
import { AuditStatsResponseDto } from './dto/audit-stats-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { AuditActionQuery, AuditResult } from './audit.enums.js';

const MAX_PERIOD_DAYS = 366;
const DEFAULT_PERIOD_DAYS = 30;

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
  ) {}

  /**
   * Valide et normalise la période [from, to] :
   * - Format ISO 8601 UTC
   * - Si absent, les 30 derniers jours (now - 30j -> now)
   * - from > to => 400 BadRequest
   * - Durée > 366 jours => 400 BadRequest
   */
  validatePeriod(fromStr?: string, toStr?: string): { from: Date; to: Date } {
    const now = new Date();
    let to: Date;
    let from: Date;

    if (toStr) {
      to = new Date(toStr);
      if (isNaN(to.getTime())) {
        throw new BadRequestException('Le paramètre "to" doit être une date ISO 8601 valide.');
      }
    } else {
      to = now;
    }

    if (fromStr) {
      from = new Date(fromStr);
      if (isNaN(from.getTime())) {
        throw new BadRequestException('Le paramètre "from" doit être une date ISO 8601 valide.');
      }
    } else {
      from = new Date(to.getTime() - DEFAULT_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    }

    if (from > to) {
      throw new BadRequestException('Le paramètre "from" ne peut pas être postérieur au paramètre "to".');
    }

    const diffMs = to.getTime() - from.getTime();
    const diffDays = diffMs / (24 * 60 * 60 * 1000);
    if (diffDays > MAX_PERIOD_DAYS) {
      throw new BadRequestException(`La période maximale autorisée est de ${MAX_PERIOD_DAYS} jours.`);
    }

    return { from, to };
  }

  /**
   * Retourne la liste paginée des journaux d'audit
   */
  async findAll(
    query: QueryAuditLogDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    const { from, to } = this.validatePeriod(query.from, query.to);

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const skip = (page - 1) * limit;

    const qb = this.auditLogsRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.actorUser', 'actorUser')
      .where('auditLog.createdAt >= :from AND auditLog.createdAt <= :to', { from, to });

    // Filtrage périmètre school_admin :
    // Un school_admin ne voit que les événements d'utilisateurs ayant une affectation active dans son école.
    // Les échecs anonymes (actor_user_id IS NULL) sont exclus pour school_admin.
    if (!currentUser.isPlatformAdmin) {
      if (!currentUser.schoolId) {
        throw new ForbiddenException('Périmètre d école non défini pour cet administrateur.');
      }

      qb.andWhere('auditLog.actorUserId IS NOT NULL');
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM assignments a
          WHERE a.user_id = auditLog.actor_user_id
            AND a.school_id = :scopedSchoolId
            AND a.status = :activeStatus
        )`,
        {
          scopedSchoolId: currentUser.schoolId,
          activeStatus: AssignmentStatus.ACTIVE,
        },
      );
    }

    // Filtre Action
    if (query.action) {
      if (query.action === AuditActionQuery.LOGIN_FAILURE) {
        qb.andWhere("auditLog.action IN ('login_failed', 'login_failure')");
      } else if (query.action === AuditActionQuery.LOGIN_SUCCESS) {
        qb.andWhere("auditLog.action = 'login_success'");
      } else if (query.action === AuditActionQuery.LOGOUT) {
        qb.andWhere("auditLog.action = 'logout'");
      }
    }

    // Filtre Résultat
    if (query.result) {
      if (query.result === AuditResult.SUCCESS) {
        qb.andWhere("auditLog.action NOT IN ('login_failed', 'login_failure')");
      } else if (query.result === AuditResult.FAILURE) {
        qb.andWhere("auditLog.action IN ('login_failed', 'login_failure')");
      }
    }

    // Filtre Target (comme la colonne channel n'existe pas, target est null ou ignoré)
    if (query.target) {
      // Si une valeur est explicitement demandée mais qu'aucun événement ne stocke 'web_portal'/'mobile_app'
      // on peut filtrer sur auditLog.target = :target
      qb.andWhere('auditLog.target = :target', { target: query.target });
    }

    // Filtre userId
    if (query.userId) {
      qb.andWhere('auditLog.actorUserId = :userId', { userId: query.userId });
    }

    // Recherche insensible à la casse sur email, nom de l'utilisateur ou IP
    if (query.search && query.search.trim() !== '') {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(auditLog.ipAddress) LIKE :term
          OR LOWER(auditLog.target) LIKE :term
          OR LOWER(actorUser.email) LIKE :term
          OR LOWER(actorUser.firstName) LIKE :term
          OR LOWER(actorUser.lastName) LIKE :term)`,
        { term },
      );
    }

    // Tri impératif : date décroissante
    qb.orderBy('auditLog.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [logs, total] = await qb.getManyAndCount();

    // Enrichir les rôles des utilisateurs trouvés
    const userRoleMap = await this.loadUserRoles(
      logs.map((l) => l.actorUserId).filter((id): id is string => !!id),
    );

    const data = logs.map((log) => this.mapToResponseDto(log, userRoleMap.get(log.actorUserId ?? '')));

    return {
      data,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Retourne les statistiques d'audit sur la période demandée
   */
  async getStats(
    query: QueryAuditStatsDto,
    currentUser: AuthenticatedUser,
  ): Promise<AuditStatsResponseDto> {
    const { from, to } = this.validatePeriod(query.from, query.to);

    const qb = this.auditLogsRepository
      .createQueryBuilder('auditLog')
      .where('auditLog.createdAt >= :from AND auditLog.createdAt <= :to', { from, to });

    if (!currentUser.isPlatformAdmin) {
      if (!currentUser.schoolId) {
        throw new ForbiddenException('Périmètre d école non défini pour cet administrateur.');
      }

      qb.andWhere('auditLog.actorUserId IS NOT NULL');
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM assignments a
          WHERE a.user_id = auditLog.actor_user_id
            AND a.school_id = :scopedSchoolId
            AND a.status = :activeStatus
        )`,
        {
          scopedSchoolId: currentUser.schoolId,
          activeStatus: AssignmentStatus.ACTIVE,
        },
      );
    }

    // Calcul par COUNT direct en base (jamais en mémoire)
    qb.select([
      'COUNT(*)::int AS total',
      "COUNT(*) FILTER (WHERE auditLog.action = 'login_success')::int AS \"loginSuccess\"",
      "COUNT(*) FILTER (WHERE auditLog.action IN ('login_failed', 'login_failure'))::int AS \"loginFailure\"",
      "COUNT(*) FILTER (WHERE auditLog.action = 'logout')::int AS logout",
    ]);

    const raw = await qb.getRawOne();

    return {
      total: Number(raw?.total ?? 0),
      loginSuccess: Number(raw?.loginSuccess ?? 0),
      loginFailure: Number(raw?.loginFailure ?? 0),
      logout: Number(raw?.logout ?? 0),
    };
  }

  /**
   * Retourne le détail d'un événement d'audit
   */
  async findOne(id: string, currentUser: AuthenticatedUser): Promise<AuditLogResponseDto> {
    const qb = this.auditLogsRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.actorUser', 'actorUser')
      .where('auditLog.id = :id', { id });

    if (!currentUser.isPlatformAdmin) {
      if (!currentUser.schoolId) {
        throw new ForbiddenException('Périmètre d école non défini pour cet administrateur.');
      }

      qb.andWhere('auditLog.actorUserId IS NOT NULL');
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM assignments a
          WHERE a.user_id = auditLog.actor_user_id
            AND a.school_id = :scopedSchoolId
            AND a.status = :activeStatus
        )`,
        {
          scopedSchoolId: currentUser.schoolId,
          activeStatus: AssignmentStatus.ACTIVE,
        },
      );
    }

    const log = await qb.getOne();
    if (!log) {
      throw new NotFoundException(`Événement d'audit avec l'identifiant "${id}" introuvable.`);
    }

    let userRole: string | null = null;
    if (log.actorUserId) {
      const roleMap = await this.loadUserRoles([log.actorUserId]);
      userRole = roleMap.get(log.actorUserId) ?? null;
    }

    return this.mapToResponseDto(log, userRole);
  }

  /**
   * Récupère le code de rôle principal des utilisateurs via leurs affectations actives
   */
  private async loadUserRoles(userIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!userIds || userIds.length === 0) return map;

    const uniqueIds = Array.from(new Set(userIds));
    const assignments = await this.assignmentsRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.role', 'role')
      .where('a.userId IN (:...uniqueIds) AND a.status = :status', {
        uniqueIds,
        status: AssignmentStatus.ACTIVE,
      })
      .getMany();

    for (const a of assignments) {
      if (a.role?.code && !map.has(a.userId)) {
        map.set(a.userId, a.role.code);
      }
    }

    return map;
  }

  /**
   * Normalisation explicite vers le DTO de réponse :
   * - action: 'login_failed' -> 'login_failure', 'login_success' -> 'login_success', 'logout' -> 'logout'
   * - result: 'success' ou 'failure'
   * - target: null (car colonne channel inexistante en base, comme convenu)
   * - details.emailAttempted: exposé uniquement lors d'échecs de connexion
   * - aucun mot de passe, hash ni secret
   */
  private mapToResponseDto(log: AuditLog, role?: string | null): AuditLogResponseDto {
    const isFailure = log.action === 'login_failed' || log.action === 'login_failure';
    const normalizedAction = isFailure ? AuditActionQuery.LOGIN_FAILURE : log.action;
    const result = isFailure ? AuditResult.FAILURE : AuditResult.SUCCESS;

    // emailAttempted n'est exposé que pour les échecs de connexion
    let emailAttempted: string | null = null;
    let failureReason: string | null = null;

    if (isFailure) {
      if (log.target && log.target.includes('@')) {
        emailAttempted = log.target;
      } else {
        failureReason = log.target ?? 'Authentication failed';
      }
    }

    return {
      id: log.id,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date(log.createdAt).toISOString(),
      action: normalizedAction,
      result,
      target: null, // Pas de colonne channel en base, renvoie null comme convenu
      user: log.actorUser
        ? {
            id: log.actorUser.id,
            firstName: log.actorUser.firstName,
            lastName: log.actorUser.lastName,
            role: role ?? null,
          }
        : null,
      ipAddress: log.ipAddress ?? null,
      details: {
        emailAttempted,
        failureReason,
        userAgent: log.userAgent ?? null,
      },
    };
  }
}
