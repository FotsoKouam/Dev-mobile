import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { UsersService } from './users.service.js';
import { User } from './user.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { Role } from '../roles/role.entity.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { AuthMethod } from './enums/auth-method.enum.js';
import { UserStatus } from './enums/user-status.enum.js';
import { RoleCode } from '../roles/enums/role-code.enum.js';
import { AssignmentStatus } from '../assignments/enums/assignment-status.enum.js';

describe('UsersService', () => {
  let service: UsersService;

  const mockQueryBuilder = {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn(),
    getOne: vi.fn(),
  };

  const mockUsersRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    count: vi.fn(),
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  };

  const mockAssignmentsRepository = {
    find: vi.fn(),
  };

  const mockRolesRepository = {
    findOne: vi.fn(),
  };

  const mockAssignmentsService = {
    create: vi.fn(),
  };

  const mockDataSource = {
    query: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Assignment),
          useValue: mockAssignmentsRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRolesRepository,
        },
        {
          provide: AssignmentsService,
          useValue: mockAssignmentsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('devrait créer un utilisateur avec statut invited', async () => {
      const dto = {
        email: 'test@example.com',
        firstName: 'Jean',
        lastName: 'Dupont',
        authMethod: AuthMethod.GOOGLE,
      };

      const now = new Date();
      const createdUser = {
        id: 'u-1',
        ...dto,
        phone: null,
        status: UserStatus.INVITED,
        lastLoginAt: null,
        assignments: [],
        createdAt: now,
        updatedAt: now,
      };

      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockReturnValue(createdUser);
      mockUsersRepository.save.mockResolvedValue(createdUser);
      mockQueryBuilder.getOne.mockResolvedValue(createdUser);

      const result = await service.create(dto);

      expect(result.id).toBe('u-1');
      expect(result.status).toBe(UserStatus.INVITED);
      expect(result.email).toBe('test@example.com');
      expect(mockAssignmentsService.create).not.toHaveBeenCalled();
    });

    it('devrait rejeter avec 409 si l email existe déjà', async () => {
      const dto = {
        email: 'existing@example.com',
        firstName: 'Jean',
        lastName: 'Dupont',
        authMethod: AuthMethod.GOOGLE,
      };

      mockUsersRepository.findOne.mockResolvedValue({ id: 'u-exists' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('devrait créer l affectation inline si un bloc assignment est fourni', async () => {
      const dto = {
        email: 'staff@example.com',
        firstName: 'Paul',
        lastName: 'Essiane',
        authMethod: AuthMethod.GOOGLE,
        assignment: {
          roleCode: RoleCode.STAFF,
          schoolId: 'school-1',
          programId: 'prog-1',
        },
      };

      const now = new Date();
      const createdUser = {
        id: 'u-2',
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: null,
        authMethod: dto.authMethod,
        status: UserStatus.INVITED,
        lastLoginAt: null,
        assignments: [],
        createdAt: now,
        updatedAt: now,
      };

      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockReturnValue(createdUser);
      mockUsersRepository.save.mockResolvedValue(createdUser);
      mockQueryBuilder.getOne.mockResolvedValue(createdUser);

      await service.create(dto);

      expect(mockAssignmentsService.create).toHaveBeenCalledWith({
        userId: 'u-2',
        roleCode: RoleCode.STAFF,
        schoolId: 'school-1',
        programId: 'prog-1',
      });
    });
  });

  describe('findOne', () => {
    it('devrait retourner l utilisateur avec ses affectations', async () => {
      const now = new Date();
      const user = {
        id: 'u-1',
        email: 'user@example.com',
        firstName: 'Jean',
        lastName: 'Dupont',
        phone: null,
        authMethod: AuthMethod.GOOGLE,
        status: UserStatus.ACTIVE,
        lastLoginAt: null,
        assignments: [
          {
            id: 'a-1',
            role: { id: 'r-1', code: RoleCode.SCHOOL_ADMIN, name: 'Admin École' },
            school: { id: 's-1', name: 'Saint Jean' },
            program: null,
            status: AssignmentStatus.ACTIVE,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      mockQueryBuilder.getOne.mockResolvedValue(user);

      const result = await service.findOne('u-1');

      expect(result.id).toBe('u-1');
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0].role.code).toBe(RoleCode.SCHOOL_ADMIN);
      expect(result.assignments[0].school?.name).toBe('Saint Jean');
    });

    it('devrait renvoyer 404 si l utilisateur n existe pas', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne('inconnu')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('devrait retourner une liste paginée d utilisateurs sans filtre', async () => {
      const now = new Date();
      const users = [
        {
          id: 'u-1',
          email: 'user1@example.com',
          firstName: 'Jean',
          lastName: 'Dupont',
          authMethod: AuthMethod.GOOGLE,
          status: UserStatus.ACTIVE,
          assignments: [],
          createdAt: now,
          updatedAt: now,
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([users, 1]);
      mockAssignmentsRepository.find.mockResolvedValue([]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1 });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.last_name', 'ASC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('user.first_name', 'ASC');
      expect(mockAssignmentsRepository.find).toHaveBeenCalledWith({
        where: { userId: In(['u-1']) },
        relations: ['role', 'school', 'program'],
      });
    });

    it('devrait renvoyer les utilisateurs triés et paginés avec leurs affectations chargées', async () => {
      const now = new Date();
      const users = [
        {
          id: 'u-1',
          email: 'alice.dupont@example.com',
          firstName: 'Alice',
          lastName: 'Dupont',
          authMethod: AuthMethod.GOOGLE,
          status: UserStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'u-2',
          email: 'bernard.martin@example.com',
          firstName: 'Bernard',
          lastName: 'Martin',
          authMethod: AuthMethod.PASSWORD,
          status: UserStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const assignments = [
        {
          id: 'a-1',
          userId: 'u-1',
          role: { id: 'r-1', code: RoleCode.STAFF, name: 'Personnel' },
          school: { id: 's-1', name: 'Saint Jean' },
          program: { id: 'p-1', name: 'ISI' },
          status: AssignmentStatus.ACTIVE,
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([users, 2]);
      mockAssignmentsRepository.find.mockResolvedValue(assignments);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('u-1');
      expect(result.data[0].lastName).toBe('Dupont');
      expect(result.data[0].assignments).toHaveLength(1);
      expect(result.data[0].assignments[0].role.code).toBe(RoleCode.STAFF);

      expect(result.data[1].id).toBe('u-2');
      expect(result.data[1].lastName).toBe('Martin');
      expect(result.data[1].assignments).toHaveLength(0);
    });

    it('devrait appliquer le filtre roleCode via EXISTS sur assignments', async () => {
      const now = new Date();
      const users = [
        {
          id: 'u-admin',
          email: 'admin@example.com',
          firstName: 'Fatso',
          lastName: 'Admin',
          authMethod: AuthMethod.PASSWORD,
          status: UserStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([users, 1]);
      mockAssignmentsRepository.find.mockResolvedValue([
        {
          id: 'a-admin',
          userId: 'u-admin',
          role: { id: 'r-admin', code: RoleCode.PLATFORM_ADMIN, name: 'Admin Plateforme' },
          school: null,
          program: null,
          status: AssignmentStatus.ACTIVE,
        },
      ]);

      const result = await service.findAll({ roleCode: RoleCode.PLATFORM_ADMIN });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'EXISTS (SELECT 1 FROM assignments a JOIN roles r ON a.role_id = r.id WHERE a.user_id = user.id AND r.code = :roleCode)',
        { roleCode: RoleCode.PLATFORM_ADMIN },
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].assignments[0].role.code).toBe(RoleCode.PLATFORM_ADMIN);
    });

    it('devrait appliquer les filtres schoolId, programId, search et status', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        status: UserStatus.ACTIVE,
        schoolId: 'school-1',
        programId: 'program-1',
        search: 'Dupont',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.status = :status',
        { status: UserStatus.ACTIVE },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'EXISTS (SELECT 1 FROM assignments a WHERE a.user_id = user.id AND a.school_id = :schoolId)',
        { schoolId: 'school-1' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'EXISTS (SELECT 1 FROM assignments a WHERE a.user_id = user.id AND a.program_id = :programId)',
        { programId: 'program-1' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(user.first_name) LIKE :term OR LOWER(user.last_name) LIKE :term OR LOWER(user.email) LIKE :term)',
        { term: '%dupont%' },
      );
    });
  });

  describe('getAccessibleSpaces', () => {
    it('devrait calculer le périmètre all pour un platform_admin', async () => {
      mockUsersRepository.findOne.mockResolvedValue({ id: 'u-admin' });
      mockAssignmentsRepository.find.mockResolvedValue([
        {
          id: 'a-1',
          userId: 'u-admin',
          role: { code: RoleCode.PLATFORM_ADMIN },
          schoolId: null,
          programId: null,
          status: AssignmentStatus.ACTIVE,
        },
      ]);

      const scopes = await service.getAccessibleSpaces('u-admin');

      expect(scopes).toHaveLength(1);
      expect(scopes[0].scope).toBe('all');
      expect(scopes[0].schoolId).toBeNull();
      expect(scopes[0].programId).toBeNull();
      expect(scopes[0].spaces).toEqual([]);
    });

    it('devrait calculer le périmètre program pour un staff ou student', async () => {
      mockUsersRepository.findOne.mockResolvedValue({ id: 'u-staff' });
      mockAssignmentsRepository.find.mockResolvedValue([
        {
          id: 'a-2',
          userId: 'u-staff',
          role: { code: RoleCode.STAFF },
          schoolId: 'school-1',
          programId: 'prog-1',
          status: AssignmentStatus.ACTIVE,
        },
      ]);

      const scopes = await service.getAccessibleSpaces('u-staff');

      expect(scopes).toHaveLength(1);
      expect(scopes[0].scope).toBe('program');
      expect(scopes[0].schoolId).toBe('school-1');
      expect(scopes[0].programId).toBe('prog-1');
    });

    it('devrait renvoyer 404 si l utilisateur n existe pas', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.getAccessibleSpaces('inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
