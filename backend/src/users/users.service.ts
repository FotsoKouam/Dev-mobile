import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { User } from './user.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { Role } from '../roles/role.entity.js';
import { RoleCode } from '../roles/enums/role-code.enum.js';
import { UserStatus } from './enums/user-status.enum.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';
import { UserResponseDto, UserAssignmentItemResponseDto } from './dto/user-response.dto.js';
import { UserStatsResponseDto } from './dto/user-stats-response.dto.js';
import { AccessibleSpaceScopeDto } from './dto/accessible-spaces-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { AssignmentStatus } from '../assignments/enums/assignment-status.enum.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly assignmentsService: AssignmentsService,
    private readonly dataSource: DataSource,
  ) {}

  async getStats(): Promise<UserStatsResponseDto> {
    const totalUsers = await this.usersRepository.count();
    const activeUsers = await this.usersRepository.count({
      where: { status: UserStatus.ACTIVE },
    });

    const roleCodes = [
      RoleCode.PLATFORM_ADMIN,
      RoleCode.SCHOOL_ADMIN,
      RoleCode.STAFF,
      RoleCode.STUDENT,
      RoleCode.GUEST,
    ];

    const byRoleResult: Record<string, number> = {
      platform_admin: 0,
      school_admin: 0,
      staff: 0,
      student: 0,
      guest: 0,
    };

    for (const code of roleCodes) {
      const res = await this.dataSource.query(
        `SELECT COUNT(DISTINCT a.user_id) as count
         FROM assignments a
         JOIN roles r ON a.role_id = r.id
         WHERE r.code = $1 AND a.status = 'active'`,
        [code],
      );
      byRoleResult[code] = Number(res[0]?.count ?? 0);
    }

    return {
      users: {
        active: activeUsers,
        total: totalUsers,
      },
      byRole: {
        platform_admin: byRoleResult.platform_admin,
        school_admin: byRoleResult.school_admin,
        staff: byRoleResult.staff,
        student: byRoleResult.student,
        guest: byRoleResult.guest,
      },
    };
  }

  async findAll(query: QueryUserDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    // Étape 1 : récupérer uniquement les Users (avec filtres et pagination)
    const qb = this.usersRepository.createQueryBuilder('user');

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.roleCode) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM assignments a JOIN roles r ON a.role_id = r.id WHERE a.user_id = user.id AND r.code = :roleCode)',
        { roleCode: query.roleCode },
      );
    }

    if (query.schoolId) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM assignments a WHERE a.user_id = user.id AND a.school_id = :schoolId)',
        { schoolId: query.schoolId },
      );
    }

    if (query.programId) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM assignments a WHERE a.user_id = user.id AND a.program_id = :programId)',
        { programId: query.programId },
      );
    }

    if (query.search && query.search.trim() !== '') {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(user.first_name) LIKE :term OR LOWER(user.last_name) LIKE :term OR LOWER(user.email) LIKE :term)',
        { term },
      );
    }

    qb.orderBy('user.last_name', 'ASC')
      .addOrderBy('user.first_name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();

    if (users.length === 0) {
      return {
        data: [],
        meta: { page, limit, total },
      };
    }

    // Étape 2 : charger les affectations avec relations (role, school, program)
    const userIds = users.map((u) => u.id);
    const assignments = await this.assignmentsRepository.find({
      where: { userId: In(userIds) },
      relations: ['role', 'school', 'program'],
    });

    const assignmentsByUserId = new Map<string, Assignment[]>();
    for (const assignment of assignments) {
      const list = assignmentsByUserId.get(assignment.userId) ?? [];
      list.push(assignment);
      assignmentsByUserId.set(assignment.userId, list);
    }

    for (const user of users) {
      user.assignments = assignmentsByUserId.get(user.id) ?? [];
    }

    return {
      data: users.map((u) => this.toResponseDto(u)),
      meta: { page, limit, total },
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.assignments', 'assignment')
      .leftJoinAndSelect('assignment.role', 'role')
      .leftJoinAndSelect('assignment.school', 'school')
      .leftJoinAndSelect('assignment.program', 'program')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return this.toResponseDto(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException(`User with email "${dto.email}" already exists`);
    }

    const user = this.usersRepository.create({
      email,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone ? dto.phone.trim() : null,
      authMethod: dto.authMethod,
      status: UserStatus.INVITED,
      lastLoginAt: null,
    });

    try {
      const saved = await this.usersRepository.save(user);

      if (dto.assignment) {
        await this.assignmentsService.create({
          userId: saved.id,
          roleCode: dto.assignment.roleCode,
          schoolId: dto.assignment.schoolId,
          programId: dto.assignment.programId,
        });
      }

      return this.findOne(saved.id);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
        throw new ConflictException(`User with email "${dto.email}" already exists`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) user.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone ? dto.phone.trim() : null;
    if (dto.status !== undefined) user.status = dto.status;

    await this.usersRepository.save(user);
    return this.findOne(id);
  }

  async getAccessibleSpaces(userId: string): Promise<AccessibleSpaceScopeDto[]> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const assignments = await this.assignmentsRepository.find({
      where: { userId, status: AssignmentStatus.ACTIVE },
      relations: ['role'],
    });

    if (assignments.length === 0) {
      return [];
    }

    const scopes: AccessibleSpaceScopeDto[] = [];

    for (const a of assignments) {
      let scope: 'all' | 'school' | 'program' | 'shared';

      switch (a.role.code) {
        case RoleCode.PLATFORM_ADMIN:
          scope = 'all';
          break;
        case RoleCode.SCHOOL_ADMIN:
          scope = 'school';
          break;
        case RoleCode.STAFF:
        case RoleCode.STUDENT:
          scope = 'program';
          break;
        case RoleCode.GUEST:
          scope = 'shared';
          break;
        default:
          scope = a.programId ? 'program' : a.schoolId ? 'school' : 'shared';
          break;
      }

      scopes.push({
        scope,
        schoolId: a.schoolId ?? null,
        programId: a.programId ?? null,
        // TODO(spaces): populate when Space module is created
        spaces: [],
      });
    }

    return scopes;
  }

  private toResponseDto(user: User): UserResponseDto {
    const assignments: UserAssignmentItemResponseDto[] = (user.assignments || []).map((a) => ({
      id: a.id,
      role: {
        id: a.role?.id ?? a.roleId,
        code: a.role?.code,
        name: a.role?.name,
      },
      school: a.school
        ? {
            id: a.school.id,
            name: a.school.name,
          }
        : null,
      program: a.program
        ? {
            id: a.program.id,
            name: a.program.name,
          }
        : null,
      status: a.status,
    }));

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      authMethod: user.authMethod,
      status: user.status,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      assignments,
      createdAt:
        user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
      updatedAt:
        user.updatedAt instanceof Date ? user.updatedAt.toISOString() : String(user.updatedAt),
    };
  }
}
