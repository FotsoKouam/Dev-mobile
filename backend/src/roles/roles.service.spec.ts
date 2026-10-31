import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RolesService } from './roles.service.js';
import { Role } from './role.entity.js';
import { RoleCode } from './enums/role-code.enum.js';
import { RoleStatus } from './enums/role-status.enum.js';

describe('RolesService', () => {
  let service: RolesService;

  const mockQueryBuilder = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn(),
  };

  const mockRolesRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  };

  const mockDataSource = {
    query: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRolesRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  describe('findAll', () => {
    it('devrait retourner une liste paginée de rôles', async () => {
      const now = new Date();
      const roles = [
        {
          id: 'role-1',
          code: RoleCode.STAFF,
          name: 'Personnel',
          description: null,
          isSystem: true,
          status: RoleStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([roles, 1]);
      mockDataSource.query
        .mockResolvedValueOnce([{ permission_code: 'add_document' }])
        .mockResolvedValueOnce([{ count: '5' }]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].code).toBe(RoleCode.STAFF);
      expect(result.data[0].permissions).toEqual(['add_document']);
      expect(result.data[0].usersCount).toBe(5);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1 });
    });
  });

  describe('findOne', () => {
    it('devrait retourner le détail d un rôle avec ses permissions', async () => {
      const now = new Date();
      const role = {
        id: 'role-1',
        code: RoleCode.STAFF,
        name: 'Personnel',
        description: 'Description',
        isSystem: true,
        status: RoleStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      mockRolesRepository.findOne.mockResolvedValue(role);
      mockDataSource.query
        .mockResolvedValueOnce([{ permission_code: 'add_document' }])
        .mockResolvedValueOnce([{ count: '10' }]);

      const result = await service.findOne('role-1');

      expect(result.id).toBe('role-1');
      expect(result.permissions).toEqual(['add_document']);
      expect(result.usersCount).toBe(10);
    });

    it('devrait renvoyer 404 si le rôle n existe pas', async () => {
      mockRolesRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('inconnu')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('devrait créer un rôle personnalisé avec code custom et isSystem false', async () => {
      const now = new Date();
      const dto = {
        name: 'Mon Rôle Perso',
        description: 'Desc',
        permissions: ['add_document'],
      };

      const createdRole = {
        id: 'role-custom-1',
        code: RoleCode.CUSTOM,
        name: dto.name,
        description: dto.description,
        isSystem: false,
        status: RoleStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      mockRolesRepository.create.mockReturnValue(createdRole);
      mockRolesRepository.save.mockResolvedValue(createdRole);
      mockDataSource.query
        .mockResolvedValueOnce([]) // DELETE
        .mockResolvedValueOnce([]) // INSERT
        .mockResolvedValueOnce([{ permission_code: 'add_document' }]); // getPermissionsForRole

      const result = await service.create(dto);

      expect(result.isSystem).toBe(false);
      expect(result.code).toBe(RoleCode.CUSTOM);
      expect(result.permissions).toEqual(['add_document']);
    });
  });

  describe('update', () => {
    it('devrait renvoyer 403 Forbidden si on tente de modifier un rôle système', async () => {
      mockRolesRepository.findOne.mockResolvedValue({
        id: 'role-sys',
        isSystem: true,
      });

      await expect(service.update('role-sys', { name: 'Nouveau nom' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('devrait mettre à jour un rôle personnalisé', async () => {
      const now = new Date();
      const role = {
        id: 'role-custom',
        isSystem: false,
        code: RoleCode.CUSTOM,
        name: 'Ancien nom',
        description: null,
        status: RoleStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      mockRolesRepository.findOne.mockResolvedValue(role);
      mockRolesRepository.save.mockResolvedValue(role);
      mockDataSource.query
        .mockResolvedValueOnce([{ permission_code: 'add_document' }])
        .mockResolvedValueOnce([{ count: '1' }]);

      const result = await service.update('role-custom', { name: 'Nouveau nom' });

      expect(role.name).toBe('Nouveau nom');
      expect(result.name).toBe('Nouveau nom');
    });
  });
});
