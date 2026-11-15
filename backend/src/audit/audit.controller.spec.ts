import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permissions.decorator.js';

describe('AuditController', () => {
  let controller: AuditController;
  let service: AuditService;
  let reflector: Reflector;

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid',
    email: 'admin@campusia.cm',
    isPlatformAdmin: true,
    permissions: ['view_audit_log'],
  } as unknown as AuthenticatedUser;

  const mockAuditService = {
    findAll: vi.fn(),
    getStats: vi.fn(),
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    service = module.get<AuditService>(AuditService);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('Permissions et sécurité', () => {
    it('findAll exige la permission view_audit_log', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, controller.findAll);
      expect(permissions).toEqual(['view_audit_log']);
    });

    it('getStats exige la permission view_audit_log', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, controller.getStats);
      expect(permissions).toEqual(['view_audit_log']);
    });

    it('findOne exige la permission view_audit_log', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, controller.findOne);
      expect(permissions).toEqual(['view_audit_log']);
    });

    it('aucune méthode d écriture (POST, PUT, PATCH, DELETE) n existe sur le contrôleur', () => {
      const prototype = Object.getPrototypeOf(controller);
      const methods = Object.getOwnPropertyNames(prototype);

      expect(methods).not.toContain('create');
      expect(methods).not.toContain('update');
      expect(methods).not.toContain('delete');
      expect(methods).not.toContain('remove');
      expect(methods).not.toContain('patch');
    });
  });

  describe('Délégation vers le service', () => {
    it('findAll délègue au service avec les filtres et l utilisateur', async () => {
      const query = { page: 1, limit: 10 };
      mockAuditService.findAll.mockResolvedValueOnce({ data: [], meta: { page: 1, limit: 10, total: 0 } });

      const result = await controller.findAll(query as any, mockUser);
      expect(service.findAll).toHaveBeenCalledWith(query, mockUser);
      expect(result).toEqual({ data: [], meta: { page: 1, limit: 10, total: 0 } });
    });

    it('getStats délègue au service avec la période et l utilisateur', async () => {
      const query = { from: '2026-11-01', to: '2026-11-10' };
      const stats = { total: 0, loginSuccess: 0, loginFailure: 0, logout: 0 };
      mockAuditService.getStats.mockResolvedValueOnce(stats);

      const result = await controller.getStats(query, mockUser);
      expect(service.getStats).toHaveBeenCalledWith(query, mockUser);
      expect(result).toEqual(stats);
    });

    it('findOne délègue au service avec l identifiant et l utilisateur', async () => {
      const detail = { id: 'log-uuid', action: 'login_success' };
      mockAuditService.findOne.mockResolvedValueOnce(detail);

      const result = await controller.findOne('log-uuid', mockUser);
      expect(service.findOne).toHaveBeenCalledWith('log-uuid', mockUser);
      expect(result).toEqual(detail);
    });
  });
});
