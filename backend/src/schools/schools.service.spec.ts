import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SchoolsService } from './schools.service.js';
import { School } from './school.entity.js';
import { Program } from '../programs/program.entity.js';
import { SchoolType } from './enums/school-type.enum.js';
import { SchoolStatus } from './enums/school-status.enum.js';

describe('SchoolsService', () => {
  let service: SchoolsService;

  const mockQueryBuilder = {
    loadRelationCountAndMap: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn(),
    getOne: vi.fn(),
  };

  const mockSchoolsRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    count: vi.fn(),
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  };

  const mockProgramsRepository = {
    count: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolsService,
        {
          provide: getRepositoryToken(School),
          useValue: mockSchoolsRepository,
        },
        {
          provide: getRepositoryToken(Program),
          useValue: mockProgramsRepository,
        },
      ],
    }).compile();

    service = module.get<SchoolsService>(SchoolsService);
  });

  describe('create', () => {
    it('devrait créer une école avec succès', async () => {
      const dto = {
        name: 'Institut Saint Jean',
        type: SchoolType.PRIVATE,
        city: 'Yaoundé',
      };

      const now = new Date();
      const createdSchool = {
        id: 'uuid-1',
        ...dto,
        status: SchoolStatus.ACTIVE,
        mainLanguage: 'fr',
        address: null,
        phone: null,
        description: null,
        googleWorkspaceDomain: null,
        createdAt: now,
        updatedAt: now,
      };

      mockSchoolsRepository.findOne.mockResolvedValue(null);
      mockSchoolsRepository.create.mockReturnValue(createdSchool);
      mockSchoolsRepository.save.mockResolvedValue(createdSchool);

      const result = await service.create(dto);

      expect(mockSchoolsRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Institut Saint Jean' },
      });
      expect(result.id).toBe('uuid-1');
      expect(result.name).toBe('Institut Saint Jean');
      expect(result.programsCount).toBe(0);
      expect(result.status).toBe(SchoolStatus.ACTIVE);
    });

    it('devrait rejeter la création avec un code 409 si le nom existe déjà', async () => {
      const dto = {
        name: 'Institut Saint Jean',
        type: SchoolType.PRIVATE,
        city: 'Yaoundé',
      };

      mockSchoolsRepository.findOne.mockResolvedValue({ id: 'uuid-existing', name: 'Institut Saint Jean' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockSchoolsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('devrait renvoyer le détail d une école', async () => {
      const now = new Date();
      const school = {
        id: 'uuid-1',
        name: 'Institut Saint Jean',
        type: SchoolType.PRIVATE,
        city: 'Yaoundé',
        address: null,
        phone: null,
        description: null,
        googleWorkspaceDomain: null,
        mainLanguage: 'fr',
        status: SchoolStatus.ACTIVE,
        programsCount: 3,
        createdAt: now,
        updatedAt: now,
      };

      mockQueryBuilder.getOne.mockResolvedValue(school);

      const result = await service.findOne('uuid-1');

      expect(result.id).toBe('uuid-1');
      expect(result.programsCount).toBe(3);
      expect(result.usersCount).toBe(0);
      expect(result.spacesCount).toBe(0);
    });

    it('devrait renvoyer 404 si l école n existe pas', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne('uuid-inexistant')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll (pagination)', () => {
    it('devrait renvoyer une liste paginée avec méta-données', async () => {
      const now = new Date();
      const schools = [
        {
          id: 'uuid-1',
          name: 'CETIC',
          type: SchoolType.PUBLIC,
          city: 'Bafoussam',
          mainLanguage: 'fr',
          status: SchoolStatus.ACTIVE,
          programsCount: 2,
          createdAt: now,
          updatedAt: now,
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([schools, 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1 });
      expect(result.data[0].name).toBe('CETIC');
    });
  });

  describe('update (modification et désactivation)', () => {
    it('devrait désactiver une école (status: inactive)', async () => {
      const now = new Date();
      const existing = {
        id: 'uuid-1',
        name: 'Institut Saint Jean',
        type: SchoolType.PRIVATE,
        city: 'Yaoundé',
        status: SchoolStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      mockSchoolsRepository.findOne.mockResolvedValue(existing);
      mockSchoolsRepository.save.mockResolvedValue({ ...existing, status: SchoolStatus.INACTIVE });
      mockQueryBuilder.getOne.mockResolvedValue({ ...existing, status: SchoolStatus.INACTIVE, programsCount: 3 });

      const result = await service.update('uuid-1', { status: SchoolStatus.INACTIVE });

      expect(mockSchoolsRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(SchoolStatus.INACTIVE);
    });

    it('devrait renvoyer 404 si l école à modifier n existe pas', async () => {
      mockSchoolsRepository.findOne.mockResolvedValue(null);

      await expect(service.update('uuid-inexistant', { city: 'Douala' })).rejects.toThrow(NotFoundException);
    });

    it('devrait renvoyer 409 si le nouveau nom est déjà pris par une autre école', async () => {
      const existing = {
        id: 'uuid-1',
        name: 'Institut Saint Jean',
      };

      mockSchoolsRepository.findOne
        .mockResolvedValueOnce(existing) // find by id
        .mockResolvedValueOnce({ id: 'uuid-2', name: 'Université de Douala' }); // find by name

      await expect(service.update('uuid-1', { name: 'Université de Douala' })).rejects.toThrow(ConflictException);
    });
  });

  describe('getStats', () => {
    it('devrait renvoyer les statistiques globales', async () => {
      mockSchoolsRepository.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(4); // active

      mockProgramsRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(9); // active

      const stats = await service.getStats();

      expect(stats.schools).toEqual({ active: 4, total: 5 });
      expect(stats.programs).toEqual({ active: 9, total: 10 });
      expect(stats.users).toEqual({ active: 0, total: 0 });
      expect(stats.institutionalSpaces).toEqual({ active: 0, total: 0 });
    });
  });
});
