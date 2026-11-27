import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SpacesService } from './spaces.service.js';
import { Space } from './space.entity.js';
import { SpaceMember } from './space-member.entity.js';
import { School } from '../schools/school.entity.js';
import { Program } from '../programs/program.entity.js';
import { User } from '../users/user.entity.js';
import { Document } from '../documents/document.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { SpaceScope, SpaceStatus } from './space.enums.js';

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

  const mockMemberQueryBuilder = {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn(),
  };

  const mockSpacesRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  };

  const mockSpaceMembersRepository = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    createQueryBuilder: vi.fn(() => mockMemberQueryBuilder),
  };

  const mockSchoolsRepository = {
    findOne: vi.fn(),
  };

  const mockProgramsRepository = {
    findOne: vi.fn(),
  };

  const mockUsersRepository = {
    findOne: vi.fn(),
  };

  const mockDocumentsRepository = {
    count: vi.fn(),
  };

  const mockAssignmentsRepository = {
    find: vi.fn(),
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
          provide: getRepositoryToken(SpaceMember),
          useValue: mockSpaceMembersRepository,
        },
        {
          provide: getRepositoryToken(School),
          useValue: mockSchoolsRepository,
        },
        {
          provide: getRepositoryToken(Program),
          useValue: mockProgramsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentsRepository,
        },
        {
          provide: getRepositoryToken(Assignment),
          useValue: mockAssignmentsRepository,
        },
      ],
    }).compile();

    service = module.get<SpacesService>(SpacesService);
  });

  describe('findAll', () => {
    it('devrait appliquer le tri space.createdAt, la pagination skip/take et les filtres avec noms de propriétés', async () => {
      const mockSpaces = [
        {
          id: 'sp-1',
          name: 'Graphes et algorithmes',
          description: 'Algo avancée',
          scope: SpaceScope.PROGRAM,
          scopeProgramId: 'prog-1',
          scopeProgram: { id: 'prog-1', name: 'ISI' },
          scopeRoleCode: null,
          status: SpaceStatus.ACTIVE,
          schoolId: 'sch-1',
          school: { id: 'sch-1', name: 'Institut Saint Jean' },
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
        scope: SpaceScope.PROGRAM,
        status: SpaceStatus.ACTIVE,
      });

      expect(mockSpacesRepository.createQueryBuilder).toHaveBeenCalledWith('space');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('space.school', 'school');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('space.scopeProgram', 'scopeProgram');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('space.createdAt', 'DESC');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('space.status = :status', {
        status: SpaceStatus.ACTIVE,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('space.schoolId = :schoolId', {
        schoolId: 'sch-1',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('space.scope = :scope', {
        scope: SpaceScope.PROGRAM,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('LOWER(space.name) LIKE :term', {
        term: '%graphes%',
      });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(15);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(15);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('create', () => {
    const schoolMock = { id: 'sch-1', name: 'Institut Saint Jean' };

    it('devrait créer un espace valide pour chaque portée (school, program, role, individual)', async () => {
      mockSchoolsRepository.findOne.mockResolvedValue(schoolMock);
      mockSpacesRepository.findOne.mockResolvedValue(null);
      mockSpacesRepository.create.mockImplementation((dto) => ({
        ...dto,
        id: 'new-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      mockSpacesRepository.save.mockImplementation(async (entity) => entity);

      // 1. School scope
      const resSchool = await service.create('sch-1', {
        name: 'Espace École',
        scope: SpaceScope.SCHOOL,
      });
      expect(resSchool.scope).toBe(SpaceScope.SCHOOL);

      // 2. Program scope
      mockProgramsRepository.findOne.mockResolvedValueOnce({
        id: 'prog-1',
        name: 'ISI',
        schoolId: 'sch-1',
      });
      const resProg = await service.create('sch-1', {
        name: 'Espace Filière',
        scope: SpaceScope.PROGRAM,
        programId: 'prog-1',
      });
      expect(resProg.scope).toBe(SpaceScope.PROGRAM);

      // 3. Role scope
      const resRole = await service.create('sch-1', {
        name: 'Espace Enseignants',
        scope: SpaceScope.ROLE,
        roleCode: 'staff',
      });
      expect(resRole.scope).toBe(SpaceScope.ROLE);

      // 4. Individual scope
      const resIndiv = await service.create('sch-1', {
        name: 'Espace Invités',
        scope: SpaceScope.INDIVIDUAL,
      });
      expect(resIndiv.scope).toBe(SpaceScope.INDIVIDUAL);
    });

    it('devrait refuser une portée program sans filière de la même école', async () => {
      mockSchoolsRepository.findOne.mockResolvedValue(schoolMock);
      mockSpacesRepository.findOne.mockResolvedValue(null);
      mockProgramsRepository.findOne.mockResolvedValueOnce({
        id: 'prog-other',
        name: 'Autre',
        schoolId: 'other-school',
      });

      await expect(
        service.create('sch-1', {
          name: 'Espace Invalide',
          scope: SpaceScope.PROGRAM,
          programId: 'prog-other',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait refuser une portée role sans code de rôle valide', async () => {
      mockSchoolsRepository.findOne.mockResolvedValue(schoolMock);
      mockSpacesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('sch-1', {
          name: 'Espace Role Invalide',
          scope: SpaceScope.ROLE,
          roleCode: 'unknown_role',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait refuser une cible sur school ou individual', async () => {
      mockSchoolsRepository.findOne.mockResolvedValue(schoolMock);
      mockSpacesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('sch-1', {
          name: 'Espace School avec cible',
          scope: SpaceScope.SCHOOL,
          programId: 'prog-1',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create('sch-1', {
          name: 'Espace Individual avec cible',
          scope: SpaceScope.INDIVIDUAL,
          roleCode: 'staff',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait renvoyer 409 sur nom dupliqué dans l école', async () => {
      mockSchoolsRepository.findOne.mockResolvedValue(schoolMock);
      mockSpacesRepository.findOne.mockResolvedValueOnce({ id: 'existing-id', name: 'Doublon' });

      await expect(
        service.create('sch-1', {
          name: 'Doublon',
          scope: SpaceScope.SCHOOL,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('devrait refuser la modification de portée quand des documents existent (409)', async () => {
      const existingSpace = {
        id: 'sp-1',
        name: 'Espace avec docs',
        schoolId: 'sch-1',
        scope: SpaceScope.SCHOOL,
        status: SpaceStatus.ACTIVE,
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(existingSpace);
      mockDocumentsRepository.count.mockResolvedValueOnce(2);

      await expect(
        service.update('sp-1', {
          scope: SpaceScope.INDIVIDUAL,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('addMember', () => {
    const spaceMock = { id: 'sp-1', schoolId: 'sch-1' };
    const userMock = {
      id: 'u-1',
      email: 'u1@example.com',
      firstName: 'Jean',
      lastName: 'Dupont',
    };

    it('devrait refuser un utilisateur d une autre école (404)', async () => {
      mockSpacesRepository.findOne.mockResolvedValue(spaceMock);
      mockUsersRepository.findOne.mockResolvedValue(userMock);
      // Affectation dans une autre école
      mockAssignmentsRepository.find.mockResolvedValueOnce([
        { userId: 'u-1', schoolId: 'sch-2', status: 'active' },
      ]);

      await expect(service.addMember('sp-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('devrait renvoyer 409 sur membre dupliqué', async () => {
      mockSpacesRepository.findOne.mockResolvedValue(spaceMock);
      mockUsersRepository.findOne.mockResolvedValue(userMock);
      mockAssignmentsRepository.find.mockResolvedValueOnce([
        { userId: 'u-1', schoolId: 'sch-1', status: 'active' },
      ]);
      mockSpaceMembersRepository.findOne.mockResolvedValueOnce({ id: 'mem-1' });

      await expect(service.addMember('sp-1', 'u-1')).rejects.toThrow(ConflictException);
    });
  });
});
