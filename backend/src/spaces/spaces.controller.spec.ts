import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { SpacesController } from './spaces.controller.js';
import { SpacesService } from './spaces.service.js';
import { SpaceStatus, SpaceType } from './space.enums.js';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permissions.decorator.js';

describe('SpacesController', () => {
  let controller: SpacesController;
  let reflector: Reflector;

  const mockSpaceResponse = {
    id: 'sp-1',
    name: 'Graphes et algorithmes',
    description: null,
    type: SpaceType.INSTITUTIONAL,
    status: SpaceStatus.ACTIVE,
    school: { id: 'sch-1', name: 'Institut Saint Jean' },
    program: { id: 'prog-1', name: 'ISI' },
    createdAt: '2026-10-21T09:30:00.000Z',
    updatedAt: '2026-10-21T09:30:00.000Z',
  };

  const mockSpacesService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
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
    it('findAll devrait être protégé par la permission de lecture manage_programs', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, SpacesController.prototype.findAll);
      expect(permissions).toEqual(['manage_programs']);
    });

    it('findOne devrait être protégé par la permission de lecture manage_programs', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, SpacesController.prototype.findOne);
      expect(permissions).toEqual(['manage_programs']);
    });

    it('create devrait être protégé par create_institutional_space', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, SpacesController.prototype.create);
      expect(permissions).toEqual(['create_institutional_space']);
    });

    it('update devrait être protégé par create_institutional_space', () => {
      const permissions = reflector.get<string[]>(PERMISSIONS_KEY, SpacesController.prototype.update);
      expect(permissions).toEqual(['create_institutional_space']);
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

    it('create devrait appeler spacesService.create avec programId et dto', async () => {
      const dto = { name: 'Graphes et algorithmes', description: 'Test' };
      mockSpacesService.create.mockResolvedValueOnce(mockSpaceResponse);

      const res = await controller.create('prog-1', dto);

      expect(mockSpacesService.create).toHaveBeenCalledWith('prog-1', dto);
      expect(res.name).toBe('Graphes et algorithmes');
    });

    it('update devrait appeler spacesService.update avec id et dto', async () => {
      const dto = { status: SpaceStatus.INACTIVE };
      mockSpacesService.update.mockResolvedValueOnce({
        ...mockSpaceResponse,
        status: SpaceStatus.INACTIVE,
      });

      const res = await controller.update('sp-1', dto);

      expect(mockSpacesService.update).toHaveBeenCalledWith('sp-1', dto);
      expect(res.status).toBe(SpaceStatus.INACTIVE);
    });
  });
});
