import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { AuditLog } from './audit-log.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { AuditActionQuery, AuditResult } from './audit.enums.js';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogsRepository: any;
  let assignmentsRepository: any;

  const mockPlatformAdmin: AuthenticatedUser = {
    id: 'admin-uuid',
    email: 'admin@campusia.cm',
    firstName: 'Admin',
    lastName: 'Platform',
    isPlatformAdmin: true,
    schoolId: null,
    permissions: ['view_audit_log'],
  } as unknown as AuthenticatedUser;

  const mockSchoolAdmin: AuthenticatedUser = {
    id: 'school-admin-uuid',
    email: 'sadmin@saintjean.cm',
    firstName: 'School',
    lastName: 'Admin',
    isPlatformAdmin: false,
    schoolId: 'school-1-uuid',
    permissions: ['view_audit_log'],
  } as unknown as AuthenticatedUser;

  const mockAuditLogs: Partial<AuditLog>[] = [
    {
      id: 'log-1',
      actorUserId: 'user-1',
      action: 'login_success',
      target: 'admin@campusia.cm',
      ipAddress: '192.0.2.1',
      userAgent: 'Mozilla/5.0 Chrome/120',
      createdAt: new Date('2026-11-10T10:00:00.000Z'),
      actorUser: {
        id: 'user-1',
        email: 'admin@campusia.cm',
        firstName: 'Paul',
        lastName: 'Essiane',
      } as any,
    },
    {
      id: 'log-2',
      actorUserId: 'user-1',
      action: 'login_failed',
      target: 'admin@campusia.cm',
      ipAddress: '192.0.2.1',
      userAgent: 'Mozilla/5.0 Chrome/120',
      createdAt: new Date('2026-11-10T09:59:00.000Z'),
      actorUser: {
        id: 'user-1',
        email: 'admin@campusia.cm',
        firstName: 'Paul',
        lastName: 'Essiane',
      } as any,
    },
    {
      id: 'log-3',
      actorUserId: null,
      action: 'login_failed',
      target: 'unknown@campusia.cm',
      ipAddress: '198.51.100.2',
      userAgent: 'Curl/7.68.0',
      createdAt: new Date('2026-11-09T08:00:00.000Z'),
      actorUser: null,
    },
    {
      id: 'log-4',
      actorUserId: 'user-1',
      action: 'logout',
      target: 'session-123',
      ipAddress: '192.0.2.1',
      userAgent: 'Mozilla/5.0 Chrome/120',
      createdAt: new Date('2026-11-10T12:00:00.000Z'),
      actorUser: {
        id: 'user-1',
        email: 'admin@campusia.cm',
        firstName: 'Paul',
        lastName: 'Essiane',
      } as any,
    },
  ];

  let queryBuilderMock: any;

  beforeEach(async () => {
    queryBuilderMock = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([mockAuditLogs, mockAuditLogs.length]),
      getOne: vi.fn().mockResolvedValue(mockAuditLogs[0]),
      getRawOne: vi.fn().mockResolvedValue({
        total: 4,
        loginSuccess: 1,
        loginFailure: 2,
        logout: 1,
      }),
    };

    const assignmentQbMock = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          userId: 'user-1',
          role: { code: 'platform_admin' },
        },
      ]),
    };

    auditLogsRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(queryBuilderMock),
    };

    assignmentsRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(assignmentQbMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: auditLogsRepository,
        },
        {
          provide: getRepositoryToken(Assignment),
          useValue: assignmentsRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('Période et validation (validatePeriod)', () => {
    it('utilise une période par défaut de 30 jours si les paramètres sont absents', () => {
      const { from, to } = service.validatePeriod(undefined, undefined);
      expect(to.getTime()).toBeGreaterThan(from.getTime());
      const diffDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
      expect(Math.round(diffDays)).toBe(30);
    });

    it('rejette une période où from > to avec une BadRequestException (400)', () => {
      expect(() =>
        service.validatePeriod('2026-11-10T00:00:00Z', '2026-11-01T00:00:00Z'),
      ).toThrow(BadRequestException);
    });

    it('rejette une période supérieure à 366 jours avec une BadRequestException (400)', () => {
      expect(() =>
        service.validatePeriod('2025-01-01T00:00:00Z', '2026-02-01T00:00:00Z'),
      ).toThrow(BadRequestException);
    });

    it('rejette une date invalide avec une BadRequestException (400)', () => {
      expect(() => service.validatePeriod('invalid-date', '2026-11-01T00:00:00Z')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('applique le tri auditLog.createdAt DESC, skip et take', async () => {
      const result = await service.findAll(
        { page: 2, limit: 15 },
        mockPlatformAdmin,
      );

      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith('auditLog.createdAt', 'DESC');
      expect(queryBuilderMock.skip).toHaveBeenCalledWith(15);
      expect(queryBuilderMock.take).toHaveBeenCalledWith(15);
      expect(result.data.length).toBe(4);
      expect(result.meta).toEqual({ page: 2, limit: 15, total: 4 });
    });

    it('applique le filtre action et normalise login_failure', async () => {
      await service.findAll(
        { action: AuditActionQuery.LOGIN_FAILURE },
        mockPlatformAdmin,
      );

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        "auditLog.action IN ('login_failed', 'login_failure')",
      );
    });

    it('applique le filtre result success et failure', async () => {
      await service.findAll(
        { result: AuditResult.FAILURE },
        mockPlatformAdmin,
      );

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        "auditLog.action IN ('login_failed', 'login_failure')",
      );
    });

    it('applique la recherche LOWER sur email, nom et IP', async () => {
      await service.findAll(
        { search: 'Essiane' },
        mockPlatformAdmin,
      );

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(actorUser.lastName) LIKE :term'),
        expect.objectContaining({ term: '%essiane%' }),
      );
    });

    it('restreint le périmètre pour school_admin aux utilisateurs de son école', async () => {
      await service.findAll({}, mockSchoolAdmin);

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('auditLog.actorUserId IS NOT NULL');
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('EXISTS ('),
        expect.objectContaining({
          scopedSchoolId: 'school-1-uuid',
        }),
      );
    });

    it('renvoie ForbiddenException si un school_admin n a pas de schoolId', async () => {
      const invalidSchoolAdmin = {
        ...mockSchoolAdmin,
        schoolId: null,
      } as unknown as AuthenticatedUser;

      await expect(service.findAll({}, invalidSchoolAdmin)).rejects.toThrow(ForbiddenException);
    });

    it('aucun champ sensible, mot de passe ni token n est renvoyé dans la réponse', async () => {
      const result = await service.findAll({}, mockPlatformAdmin);
      for (const item of result.data) {
        expect((item as any).password).toBeUndefined();
        expect((item as any).passwordHash).toBeUndefined();
        expect((item as any).refreshToken).toBeUndefined();
        expect((item as any).refreshTokenHash).toBeUndefined();
      }
    });

    it('n expose emailAttempted que pour les échecs de connexion', async () => {
      const result = await service.findAll({}, mockPlatformAdmin);
      const successItem = result.data.find((d) => d.action === 'login_success');
      const failureItem = result.data.find((d) => d.action === 'login_failure');

      expect(successItem?.details.emailAttempted).toBeNull();
      expect(failureItem?.details.emailAttempted).toBe('admin@campusia.cm');
    });
  });

  describe('getStats', () => {
    it('effectue un calcul direct en base (COUNT) sur la période', async () => {
      const stats = await service.getStats({}, mockPlatformAdmin);

      expect(queryBuilderMock.select).toHaveBeenCalled();
      expect(stats).toEqual({
        total: 4,
        loginSuccess: 1,
        loginFailure: 2,
        logout: 1,
      });
    });

    it('applique le filtre d école pour un school_admin dans getStats', async () => {
      await service.getStats({}, mockSchoolAdmin);

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('auditLog.actorUserId IS NOT NULL');
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('EXISTS ('),
        expect.objectContaining({ scopedSchoolId: 'school-1-uuid' }),
      );
    });
  });

  describe('findOne', () => {
    it('renvoie le détail de l événement d audit', async () => {
      const result = await service.findOne('log-1', mockPlatformAdmin);
      expect(result.id).toBe('log-1');
      expect(result.action).toBe('login_success');
      expect(result.result).toBe('success');
      expect(result.user?.firstName).toBe('Paul');
      expect(result.user?.role).toBe('platform_admin');
    });

    it('lance une NotFoundException si l événement est absent', async () => {
      queryBuilderMock.getOne.mockResolvedValueOnce(null);
      await expect(service.findOne('inexistant', mockPlatformAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
