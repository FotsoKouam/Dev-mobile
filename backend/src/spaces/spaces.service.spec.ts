import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SpacesService } from './spaces.service.js';
import { Space } from './space.entity.js';
import { Program } from '../programs/program.entity.js';
import { SpaceStatus, SpaceType } from './space.enums.js';

describe('SpacesService', () => {
  let service: SpacesService;

  const mockQueryBuilder = {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn(),
    getOne: vi.fn(),
  };

  const mockSpacesRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  };

  const mockProgramsRepository = {
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpacesService,
        {
          provide: getRepositoryToken(Space),
          useValue: mockSpacesRepository,
        },
        {
          provide: getRepositoryToken(Program),
          useValue: mockProgramsRepository,
        },
      ],
    }).compile();

    service = module.get<SpacesService>(SpacesService);
  });

  describe('findAll', () => {
    it('devrait appliquer le tri space.createdAt, la pagination skip/take et les filtres avec noms d entités', async () => {
      const mockSpaces = [
        {
          id: 'sp-1',
          name: 'Graphes et algorithmes',
          description: 'Algo avancée',
          type: SpaceType.INSTITUTIONAL,
          status: SpaceStatus.ACTIVE,
          programId: 'prog-1',
          program: {
            id: 'prog-1',
            name: 'ISI',
            school: { id: 'sch-1', name: 'Institut Saint Jean' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([mockSpaces, 1]);

      const result = await service.findAll({
        page: 2,
        limit: 15,
        search: 'Graphes',
        schoolId: 'sch-1',
        programId: 'prog-1',
        status: SpaceStatus.ACTIVE,
      });

      expect(mockSpacesRepository.createQueryBuilder).toHaveBeenCalledWith('space');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('space.program', 'program');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('program.school', 'school');

      // Vérification impérative : noms d'entités, PAS de snake_case SQL
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('space.createdAt', 'DESC');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('space.status = :status', {
        status: SpaceStatus.ACTIVE,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('space.programId = :programId', {
        programId: 'prog-1',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('program.schoolId = :schoolId', {
        schoolId: 'sch-1',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('LOWER(space.name) LIKE :term', {
        term: '%graphes%',
      });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(15);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(15);

      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('Graphes et algorithmes');
      expect(result.meta).toEqual({ page: 2, limit: 15, total: 1 });
    });
  });

  describe('findOne', () => {
    it('devrait renvoyer le détail d un espace avec school et program', async () => {
      const mockSpace = {
        id: 'sp-1',
        name: 'Graphes et algorithmes',
        description: null,
        type: SpaceType.INSTITUTIONAL,
        status: SpaceStatus.ACTIVE,
        program: {
          id: 'prog-1',
          name: 'ISI',
          school: { id: 'sch-1', name: 'Institut Saint Jean' },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockSpace);

      const res = await service.findOne('sp-1');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('space.id = :id', { id: 'sp-1' });
      expect(res.id).toBe('sp-1');
      expect(res.school).toEqual({ id: 'sch-1', name: 'Institut Saint Jean' });
      expect(res.program).toEqual({ id: 'prog-1', name: 'ISI' });
    });

    it('devrait lever NotFoundException si l espace n existe pas', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.findOne('sp-unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('devrait créer un espace institutional rattaché à la filière', async () => {
      mockProgramsRepository.findOne.mockResolvedValueOnce({
        id: 'prog-1',
        name: 'ISI',
        school: { id: 'sch-1', name: 'Institut Saint Jean' },
      });
      mockSpacesRepository.findOne.mockResolvedValueOnce(null); // pas de doublon

      const createdEntity = {
        id: 'sp-1',
        name: 'Développement mobile',
        description: 'React Native & Flutter',
        type: SpaceType.INSTITUTIONAL,
        programId: 'prog-1',
        status: SpaceStatus.ACTIVE,
        program: {
          id: 'prog-1',
          name: 'ISI',
          school: { id: 'sch-1', name: 'Institut Saint Jean' },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSpacesRepository.create.mockReturnValueOnce(createdEntity);
      mockSpacesRepository.save.mockResolvedValueOnce(createdEntity);
      mockQueryBuilder.getOne.mockResolvedValueOnce(createdEntity);

      const res = await service.create('prog-1', {
        name: 'Développement mobile',
        description: 'React Native & Flutter',
      });

      expect(mockSpacesRepository.create).toHaveBeenCalledWith({
        name: 'Développement mobile',
        description: 'React Native & Flutter',
        type: SpaceType.INSTITUTIONAL,
        programId: 'prog-1',
        status: SpaceStatus.ACTIVE,
      });
      expect(res.name).toBe('Développement mobile');
      expect(res.type).toBe(SpaceType.INSTITUTIONAL);
    });

    it('devrait lever NotFoundException si la filière n existe pas', async () => {
      mockProgramsRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.create('prog-none', { name: 'Espace test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait lever ConflictException si le nom existe déjà dans la filière', async () => {
      mockProgramsRepository.findOne.mockResolvedValueOnce({ id: 'prog-1' });
      mockSpacesRepository.findOne.mockResolvedValueOnce({
        id: 'sp-existing',
        name: 'Développement mobile',
        programId: 'prog-1',
      });

      await expect(
        service.create('prog-1', { name: 'Développement mobile' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('devrait modifier name, description et status', async () => {
      const existing = {
        id: 'sp-1',
        name: 'Ancien nom',
        description: 'Ancienne desc',
        status: SpaceStatus.ACTIVE,
        programId: 'prog-1',
        type: SpaceType.INSTITUTIONAL,
      };
      mockSpacesRepository.findOne.mockResolvedValueOnce(existing); // find for update
      mockSpacesRepository.findOne.mockResolvedValueOnce(null); // no conflict for new name
      mockSpacesRepository.save.mockResolvedValueOnce(existing);

      const updated = {
        ...existing,
        name: 'Nouveau nom',
        description: 'Nouvelle desc',
        status: SpaceStatus.INACTIVE,
        program: {
          id: 'prog-1',
          name: 'ISI',
          school: { id: 'sch-1', name: 'Institut Saint Jean' },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(updated);

      const res = await service.update('sp-1', {
        name: 'Nouveau nom',
        description: 'Nouvelle desc',
        status: SpaceStatus.INACTIVE,
      });

      expect(existing.name).toBe('Nouveau nom');
      expect(existing.description).toBe('Nouvelle desc');
      expect(existing.status).toBe(SpaceStatus.INACTIVE);
      expect(res.name).toBe('Nouveau nom');
      expect(res.status).toBe(SpaceStatus.INACTIVE);
    });

    it('devrait lever NotFoundException si l espace à modifier n existe pas', async () => {
      mockSpacesRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.update('sp-unknown', { name: 'Nom test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait lever ConflictException si le nouveau nom est déjà pris dans la filière', async () => {
      const existing = {
        id: 'sp-1',
        name: 'Ancien nom',
        programId: 'prog-1',
      };
      mockSpacesRepository.findOne.mockResolvedValueOnce(existing);
      mockSpacesRepository.findOne.mockResolvedValueOnce({
        id: 'sp-other',
        name: 'Nom pris',
        programId: 'prog-1',
      });

      await expect(
        service.update('sp-1', { name: 'Nom pris' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});

