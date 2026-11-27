import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { SpacesController } from './spaces.controller.js';
import { SpacesService } from './spaces.service.js';
import { SpaceScope, SpaceStatus } from './space.enums.js';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permissions.decorator.js';

describe('SpacesController', () => {
  let controller: SpacesController;
  let reflector: Reflector;

  const mockSpaceResponse = {
    id: 'sp-1',
    name: 'Graphes et algorithmes',
    description: null,
    scope: SpaceScope.PROGRAM,
    scopeProgramId: 'prog-1',
    scopeProgram: { id: 'prog-1', name: 'ISI' },
    scopeRoleCode: null,
    status: SpaceStatus.ACTIVE,
    school: { id: 'sch-1', name: 'Institut Saint Jean' },
    createdAt: '2026-10-21T09:30:00.000Z',
    updatedAt: '2026-10-21T09:30:00.000Z',
  };

  const mockMemberResponse = {
    id: 'mem-1',
    spaceId: 'sp-1',
    userId: 'user-1',
    user: {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    },
    createdById: null,
    createdAt: '2026-10-21T09:30:00.000Z',
    updatedAt: '2026-10-21T09:30:00.000Z',
  };

  const mockSpacesService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    listMembers: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpacesController],
      providers: [
        {
          provide: SpacesService,
          useValue: mockSpacesService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<SpacesController>(SpacesController);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('Permissions des routes', () => {
    it('findAll devrait être protégé par manage_spaces', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, SpacesController.prototype.findAll);
      expect(permissions).toEqual(['manage_spaces']);
    });

    it('findOne devrait être protégé par manage_spaces', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, SpacesController.prototype.findOne);
      expect(permissions).toEqual(['manage_spaces']);
    });

    it('create devrait être protégé par manage_spaces', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, SpacesController.prototype.create);
      expect(permissions).toEqual(['manage_spaces']);
    });

    it('update devrait être protégé par manage_spaces', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, SpacesController.prototype.update);
      expect(permissions).toEqual(['manage_spaces']);
    });

    it('listMembers devrait être protégé par manage_spaces', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, SpacesController.prototype.listMembers);
      expect(permissions).toEqual(['manage_spaces']);
    });

    it('addMember devrait être protégé par manage_spaces', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, SpacesController.prototype.addMember);
      expect(permissions).toEqual(['manage_spaces']);
    });

    it('removeMember devrait être protégé par manage_spaces', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, SpacesController.prototype.removeMember);
      expect(permissions).toEqual(['manage_spaces']);
    });

    it('aucune route de suppression directe de l espace ne doit exister sur le contrôleur', () => {
      expect((SpacesController.prototype as any).remove).toBeUndefined();
      expect((SpacesController.prototype as any).delete).toBeUndefined();
      expect((SpacesController.prototype as any).deleteSpace).toBeUndefined();
    });
  });

  describe('Exécution des routes', () => {
    it('findAll devrait appeler spacesService.findAll avec les query params', async () => {
      const query = { page: 1, limit: 10, search: 'Graphes' };
      mockSpacesService.findAll.mockResolvedValueOnce({
        data: [mockSpaceResponse],
        meta: { page: 1, limit: 10, total: 1 },
      });

      const res = await controller.findAll(query);

      expect(mockSpacesService.findAll).toHaveBeenCalledWith(query);
      expect(res.data[0].id).toBe('sp-1');
    });

    it('findOne devrait appeler spacesService.findOne avec l id', async () => {
      mockSpacesService.findOne.mockResolvedValueOnce(mockSpaceResponse);

      const res = await controller.findOne('sp-1');

      expect(mockSpacesService.findOne).toHaveBeenCalledWith('sp-1');
      expect(res.id).toBe('sp-1');
    });

    it('create devrait appeler spacesService.create avec schoolId et dto', async () => {
      const dto = { name: 'Graphes et algorithmes', scope: SpaceScope.SCHOOL };
      mockSpacesService.create.mockResolvedValueOnce(mockSpaceResponse);

      const res = await controller.create('sch-1', dto as any);

      expect(mockSpacesService.create).toHaveBeenCalledWith('sch-1', dto);
      expect(res.id).toBe('sp-1');
    });

    it('update devrait appeler spacesService.update avec l id et dto', async () => {
      const dto = { name: 'Nouveau nom' };
      mockSpacesService.update.mockResolvedValueOnce({ ...mockSpaceResponse, name: 'Nouveau nom' });

      const res = await controller.update('sp-1', dto);

      expect(mockSpacesService.update).toHaveBeenCalledWith('sp-1', dto);
      expect(res.name).toBe('Nouveau nom');
    });

    it('listMembers devrait appeler spacesService.listMembers', async () => {
      const query = { page: 1, limit: 10 };
      mockSpacesService.listMembers.mockResolvedValueOnce({
        data: [mockMemberResponse],
        meta: { page: 1, limit: 10, total: 1 },
      });

      const res = await controller.listMembers('sp-1', query);

      expect(mockSpacesService.listMembers).toHaveBeenCalledWith('sp-1', query);
      expect(res.data[0].id).toBe('mem-1');
    });

    it('addMember devrait appeler spacesService.addMember avec spaceId, userId et currentUser', async () => {
      mockSpacesService.addMember.mockResolvedValueOnce(mockMemberResponse);

      const res = await controller.addMember('sp-1', { userId: 'user-1' }, { id: 'admin-1' } as any);

      expect(mockSpacesService.addMember).toHaveBeenCalledWith('sp-1', 'user-1', 'admin-1');
      expect(res.id).toBe('mem-1');
    });

    it('removeMember devrait appeler spacesService.removeMember avec spaceId et userId', async () => {
      mockSpacesService.removeMember.mockResolvedValueOnce(undefined);

      await controller.removeMember('sp-1', 'user-1');

      expect(mockSpacesService.removeMember).toHaveBeenCalledWith('sp-1', 'user-1');
    });
  });
});
