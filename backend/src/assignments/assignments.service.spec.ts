import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service.js';
import { Assignment } from './assignment.entity.js';
import { User } from '../users/user.entity.js';
import { Role } from '../roles/role.entity.js';
import { School } from '../schools/school.entity.js';
import { Program } from '../programs/program.entity.js';
import { RoleCode } from '../roles/enums/role-code.enum.js';
import { AssignmentStatus } from './enums/assignment-status.enum.js';

describe('AssignmentsService', () => {
  let service: AssignmentsService;

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

  const mockAssignmentsRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  };

  const mockUsersRepository = {
    findOne: vi.fn(),
  };

  const mockRolesRepository = {
    findOne: vi.fn(),
  };

  const mockSchoolsRepository = {
    findOne: vi.fn(),
  };

  const mockProgramsRepository = {
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        {
          provide: getRepositoryToken(Assignment),
          useValue: mockAssignmentsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRolesRepository,
        },
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

    service = module.get<AssignmentsService>(AssignmentsService);
  });

  describe('Validation des règles métier par rôle', () => {
    describe('platform_admin', () => {
      it('devrait accepter un platform_admin sans école ni filière', async () => {
        await expect(
          service.validateAssignmentBusinessRules(RoleCode.PLATFORM_ADMIN, undefined, undefined),
        ).resolves.toBeUndefined();
      });

      it('devrait renvoyer 400 si platform_admin est créé avec une école', async () => {
        await expect(
          service.validateAssignmentBusinessRules(RoleCode.PLATFORM_ADMIN, 'school-1', undefined),
        ).rejects.toThrow(BadRequestException);
      });

      it('devrait renvoyer 400 si platform_admin est créé avec une filière', async () => {
        await expect(
          service.validateAssignmentBusinessRules(RoleCode.PLATFORM_ADMIN, undefined, 'program-1'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('school_admin', () => {
      it('devrait accepter un school_admin avec école et sans filière', async () => {
        mockSchoolsRepository.findOne.mockResolvedValue({ id: 'school-1' });

        await expect(
          service.validateAssignmentBusinessRules(RoleCode.SCHOOL_ADMIN, 'school-1', undefined),
        ).resolves.toBeUndefined();
      });

      it('devrait renvoyer 400 si school_admin n a pas d école', async () => {
        await expect(
          service.validateAssignmentBusinessRules(RoleCode.SCHOOL_ADMIN, undefined, undefined),
        ).rejects.toThrow(BadRequestException);
      });

      it('devrait renvoyer 400 si school_admin a une filière', async () => {
        await expect(
          service.validateAssignmentBusinessRules(RoleCode.SCHOOL_ADMIN, 'school-1', 'program-1'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('staff & student', () => {
      it('devrait accepter staff avec école et filière appartenant à l école', async () => {
        mockSchoolsRepository.findOne.mockResolvedValue({ id: 'school-1' });
        mockProgramsRepository.findOne.mockResolvedValue({ id: 'program-1', schoolId: 'school-1' });

        await expect(
          service.validateAssignmentBusinessRules(RoleCode.STAFF, 'school-1', 'program-1'),
        ).resolves.toBeUndefined();
      });

      it('devrait renvoyer 400 si staff manque de filière', async () => {
        await expect(
          service.validateAssignmentBusinessRules(RoleCode.STAFF, 'school-1', undefined),
        ).rejects.toThrow(BadRequestException);
      });

      it('devrait renvoyer 400 si student manque d école', async () => {
        await expect(
          service.validateAssignmentBusinessRules(RoleCode.STUDENT, undefined, 'program-1'),
        ).rejects.toThrow(BadRequestException);
      });

      it('devrait renvoyer 400 si la filière n appartient pas à l école indiquée', async () => {
        mockSchoolsRepository.findOne.mockResolvedValue({ id: 'school-1' });
        mockProgramsRepository.findOne.mockResolvedValue({ id: 'program-1', schoolId: 'other-school' });

        await expect(
          service.validateAssignmentBusinessRules(RoleCode.STAFF, 'school-1', 'program-1'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('guest', () => {
      it('devrait accepter guest sans école ni filière', async () => {
        await expect(
          service.validateAssignmentBusinessRules(RoleCode.GUEST, undefined, undefined),
        ).resolves.toBeUndefined();
      });

      it('devrait accepter guest avec école sans filière', async () => {
        mockSchoolsRepository.findOne.mockResolvedValue({ id: 'school-1' });

        await expect(
          service.validateAssignmentBusinessRules(RoleCode.GUEST, 'school-1', undefined),
        ).resolves.toBeUndefined();
      });

      it('devrait renvoyer 400 si guest a une filière', async () => {
        await expect(
          service.validateAssignmentBusinessRules(RoleCode.GUEST, undefined, 'program-1'),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('create', () => {
    it('devrait renvoyer 404 si l utilisateur n existe pas', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ userId: 'u-1', roleCode: RoleCode.PLATFORM_ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait renvoyer 404 si le rôle n existe pas', async () => {
      mockUsersRepository.findOne.mockResolvedValue({ id: 'u-1' });
      mockRolesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ userId: 'u-1', roleCode: RoleCode.PLATFORM_ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait renvoyer 409 si une affectation identique existe déjà', async () => {
      mockUsersRepository.findOne.mockResolvedValue({ id: 'u-1' });
      mockRolesRepository.findOne.mockResolvedValue({ id: 'r-1', code: RoleCode.PLATFORM_ADMIN });

      mockQueryBuilder.getOne.mockResolvedValue({ id: 'existing-assignment' });

      await expect(
        service.create({ userId: 'u-1', roleCode: RoleCode.PLATFORM_ADMIN }),
      ).rejects.toThrow(ConflictException);
    });

    it('devrait créer une affectation avec succès', async () => {
      mockUsersRepository.findOne.mockResolvedValue({ id: 'u-1', firstName: 'Jean', lastName: 'Paul', email: 'j@p.com' });
      mockRolesRepository.findOne.mockResolvedValue({ id: 'r-1', code: RoleCode.PLATFORM_ADMIN, name: 'Admin' });
      mockQueryBuilder.getOne.mockResolvedValue(null); // pas de doublon

      const created = {
        id: 'assign-1',
        userId: 'u-1',
        roleId: 'r-1',
        status: AssignmentStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAssignmentsRepository.create.mockReturnValue(created);
      mockAssignmentsRepository.save.mockResolvedValue(created);

      mockAssignmentsRepository.findOne.mockResolvedValue({
        ...created,
        user: { id: 'u-1', firstName: 'Jean', lastName: 'Paul', email: 'j@p.com' },
        role: { id: 'r-1', code: RoleCode.PLATFORM_ADMIN, name: 'Admin' },
        school: null,
        program: null,
      });

      const res = await service.create({ userId: 'u-1', roleCode: RoleCode.PLATFORM_ADMIN });

      expect(res.id).toBe('assign-1');
      expect(res.role.code).toBe(RoleCode.PLATFORM_ADMIN);
      expect(res.status).toBe(AssignmentStatus.ACTIVE);
    });
  });

  describe('deactivate', () => {
    it('devrait désactiver une affectation (status: inactive)', async () => {
      const assignment = {
        id: 'assign-1',
        status: AssignmentStatus.ACTIVE,
        userId: 'u-1',
        roleId: 'r-1',
      };
      mockAssignmentsRepository.findOne
        .mockResolvedValueOnce(assignment)
        .mockResolvedValueOnce({
          ...assignment,
          status: AssignmentStatus.INACTIVE,
          user: { id: 'u-1' },
          role: { id: 'r-1', code: RoleCode.STAFF },
          school: null,
          program: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const res = await service.deactivate('assign-1');
      expect(assignment.status).toBe(AssignmentStatus.INACTIVE);
      expect(res.status).toBe(AssignmentStatus.INACTIVE);
    });
  });
});
