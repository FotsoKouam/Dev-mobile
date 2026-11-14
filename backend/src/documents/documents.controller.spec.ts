import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permissions.decorator.js';
import { DocumentFileType, DocumentStatus } from './document.enums.js';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let service: Partial<Record<keyof DocumentsService, any>>;
  let reflector: Reflector;

  beforeEach(() => {
    service = {
      findAll: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 10, total: 0 } }),
      getStats: vi.fn().mockResolvedValue({ total: 0, available: 0, processing: 0, error: 0 }),
      findOne: vi.fn().mockResolvedValue({
        id: 'doc-1',
        name: 'test.pdf',
        fileType: DocumentFileType.PDF,
        status: DocumentStatus.PENDING,
      }),
      upload: vi.fn().mockResolvedValue({
        id: 'doc-1',
        name: 'test.pdf',
        fileType: DocumentFileType.PDF,
        status: DocumentStatus.PENDING,
      }),
    };

    controller = new DocumentsController(service as any);
    reflector = new Reflector();
  });

  describe('Permissions', () => {
    it('findAll exige la permission de lecture manage_programs', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, controller.findAll);
      expect(permissions).toEqual(['manage_programs']);
    });

    it('getStats exige la permission de lecture manage_programs', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, controller.getStats);
      expect(permissions).toEqual(['manage_programs']);
    });

    it('findOne exige la permission de lecture manage_programs', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, controller.findOne);
      expect(permissions).toEqual(['manage_programs']);
    });

    it('upload exige la permission add_document', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, controller.upload);
      expect(permissions).toEqual(['add_document']);
    });
  });

  describe('Délégation aux méthodes du service', () => {
    it('findAll appelle service.findAll avec query', async () => {
      const query = { page: 1, limit: 10 };
      await controller.findAll(query as any);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('getStats appelle service.getStats avec filtres schoolId et programId', async () => {
      await controller.getStats('sch-1', 'prog-1');
      expect(service.getStats).toHaveBeenCalledWith('sch-1', 'prog-1');
    });

    it('findOne appelle service.findOne avec id', async () => {
      await controller.findOne('doc-uuid');
      expect(service.findOne).toHaveBeenCalledWith('doc-uuid');
    });

    it('upload appelle service.upload avec spaceId, file, dto et user', async () => {
      const file = { originalname: 'file.pdf' } as any;
      const dto = { name: 'Mon Document' };
      const req = { user: { id: 'u-1', roles: ['platform_admin'] } };

      await controller.upload('space-uuid', file, dto, req);
      expect(service.upload).toHaveBeenCalledWith('space-uuid', file, dto, req.user);
    });
  });
});
