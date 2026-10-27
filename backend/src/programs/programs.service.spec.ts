import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProgramsService } from './programs.service.js';
import { Program } from './program.entity.js';
import { School } from '../schools/school.entity.js';
import { ProgramStatus } from './enums/program-status.enum.js';

describe('ProgramsService', () => {
  let service: ProgramsService;

  const mockQueryBuilder = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn(),
  };

  const mockProgramsRepository = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    count: vi.fn(),
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  };

  const mockSchoolsRepository = {
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramsService,
        {
          provide: getRepositoryToken(Program),
          useValue: mockProgramsRepository,
        },
        {
          provide: getRepositoryToken(School),
          useValue: mockSchoolsRepository,
        },
      ],
    }).compile();

    service = module.get<ProgramsService>(ProgramsService);
  });

  describe('create', () => {
    it('devrait créer une filière pour une école avec succès', async () => {
      const now = new Date();
      const school = { id: 'school-1', name: 'Saint Jean' };
      const dto = { name: 'ISI', description: 'Génie logiciel' };
      const created = {
        id: 'prog-1',
        schoolId: 'school-1',
        name: 'ISI',
        description: 'Génie logiciel',
        status: ProgramStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      mockSchoolsRepository.findOne.mockResolvedValue(school);
      mockProgramsRepository.findOne.mockResolvedValue(null);
      mockProgramsRepository.create.mockReturnValue(created);
      mockProgramsRepository.save.mockResolvedValue(created);

      const result = await service.create('school-1', dto);

      expect(result.id).toBe('prog-1');
      expect(result.name).toBe('ISI');
      expect(result.schoolId).toBe('school-1');
      expect(result.status).toBe(ProgramStatus.ACTIVE);
      expect(result.usersCount).toBe(0);
      expect(result.spacesCount).toBe(0);
    });

    it('devrait rejeter la création avec 404 si l école n existe pas', async () => {
      mockSchoolsRepository.findOne.mockResolvedValue(null);

      await expect(service.create('school-inexistante', { name: 'ISI' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devrait rejeter la création avec 409 si la filière existe déjà dans cette école', async () => {
      mockSchoolsRepository.findOne.mockResolvedValue({ id: 'school-1' });
      mockProgramsRepository.findOne.mockResolvedValue({ id: 'prog-existing', name: 'ISI' });

      await expect(service.create('school-1', { name: 'ISI' })).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('devrait renvoyer le détail d une filière', async () => {
      const now = new Date();
      const program = {
        id: 'prog-1',
        schoolId: 'school-1',
        name: 'ISI',
        description: null,
        status: ProgramStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      mockProgramsRepository.findOne.mockResolvedValue(program);

      const result = await service.findOne('prog-1');

      expect(result.id).toBe('prog-1');
      expect(result.name).toBe('ISI');
      expect(result.description).toBeNull();
      expect(result.usersCount).toBe(0);
      expect(result.spacesCount).toBe(0);
    });

    it('devrait renvoyer 404 si la filière n existe pas', async () => {
      mockProgramsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('prog-inexistante')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySchool (pagination)', () => {
    it('devrait renvoyer les filières paginées d une école', async () => {
      const now = new Date();
      mockSchoolsRepository.findOne.mockResolvedValue({ id: 'school-1' });

      const programs = [
        {
          id: 'prog-1',
          schoolId: 'school-1',
          name: 'ISI',
          description: null,
          status: ProgramStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([programs, 1]);

      const result = await service.findBySchool('school-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1 });
      expect(result.data[0].name).toBe('ISI');
    });

    it('devrait renvoyer 404 si l école n existe pas', async () => {
      mockSchoolsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findBySchool('school-inexistante', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update (modification et désactivation)', () => {
    it('devrait modifier et désactiver une filière (status: inactive)', async () => {
      const now = new Date();
      const existing = {
        id: 'prog-1',
        schoolId: 'school-1',
        name: 'ISI',
        description: 'Ancienne desc',
        status: ProgramStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      mockProgramsRepository.findOne.mockResolvedValue(existing);
      mockProgramsRepository.save.mockResolvedValue({
        ...existing,
        status: ProgramStatus.INACTIVE,
      });

      const result = await service.update('prog-1', { status: ProgramStatus.INACTIVE });

      expect(mockProgramsRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(ProgramStatus.INACTIVE);
    });

    it('devrait renvoyer 404 si la filière n existe pas', async () => {
      mockProgramsRepository.findOne.mockResolvedValue(null);

      await expect(service.update('prog-inexistante', { name: 'SRT' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devrait renvoyer 409 si le nouveau nom est déjà pris dans la même école', async () => {
      const existing = {
        id: 'prog-1',
        schoolId: 'school-1',
        name: 'ISI',
      };

      mockProgramsRepository.findOne
        .mockResolvedValueOnce(existing) // find by id
        .mockResolvedValueOnce({ id: 'prog-2', schoolId: 'school-1', name: 'SRT' }); // find by name

      await expect(service.update('prog-1', { name: 'SRT' })).rejects.toThrow(ConflictException);
    });
  });
});
