import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './assignment.entity.js';
import { User } from '../users/user.entity.js';
import { Role } from '../roles/role.entity.js';
import { School } from '../schools/school.entity.js';
import { Program } from '../programs/program.entity.js';
import { RoleCode } from '../roles/enums/role-code.enum.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { UpdateAssignmentDto } from './dto/update-assignment.dto.js';
import { QueryAssignmentDto } from './dto/query-assignment.dto.js';
import { AssignmentResponseDto } from './dto/assignment-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { AssignmentStatus } from './enums/assignment-status.enum.js';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(School)
    private readonly schoolsRepository: Repository<School>,
    @InjectRepository(Program)
    private readonly programsRepository: Repository<Program>,
  ) {}

  async findAll(query: QueryAssignmentDto): Promise<PaginatedResponseDto<AssignmentResponseDto>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.user', 'user')
      .leftJoinAndSelect('assignment.role', 'role')
      .leftJoinAndSelect('assignment.school', 'school')
      .leftJoinAndSelect('assignment.program', 'program');

    if (query.status) {
      qb.andWhere('assignment.status = :status', { status: query.status });
    }

    if (query.schoolId) {
      qb.andWhere('assignment.school_id = :schoolId', { schoolId: query.schoolId });
    }

    if (query.programId) {
      qb.andWhere('assignment.program_id = :programId', { programId: query.programId });
    }

    if (query.roleCode) {
      qb.andWhere('role.code = :roleCode', { roleCode: query.roleCode });
    }

    if (query.search && query.search.trim() !== '') {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(user.first_name) LIKE :term OR LOWER(user.last_name) LIKE :term OR LOWER(user.email) LIKE :term)',
        { term },
      );
    }

    qb.orderBy('assignment.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [assignments, total] = await qb.getManyAndCount();

    return {
      data: assignments.map((a) => this.toResponseDto(a)),
      meta: { page, limit, total },
    };
  }

  async findOne(id: string): Promise<AssignmentResponseDto> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id },
      relations: ['user', 'role', 'school', 'program'],
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID "${id}" not found`);
    }

    return this.toResponseDto(assignment);
  }

  async create(dto: CreateAssignmentDto): Promise<AssignmentResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${dto.userId}" not found`);
    }

    const role = await this.rolesRepository.findOne({ where: { code: dto.roleCode } });
    if (!role) {
      throw new NotFoundException(`Role with code "${dto.roleCode}" not found`);
    }

    await this.validateAssignmentBusinessRules(dto.roleCode, dto.schoolId, dto.programId);

    // Vérifier doublon strict
    const duplicate = await this.findDuplicate(dto.userId, role.id, dto.schoolId, dto.programId);
    if (duplicate) {
      throw new ConflictException('An identical assignment already exists for this user');
    }

    const assignment = this.assignmentsRepository.create({
      userId: dto.userId,
      roleId: role.id,
      schoolId: dto.schoolId ?? null,
      programId: dto.programId ?? null,
      status: AssignmentStatus.ACTIVE,
    });

    try {
      const saved = await this.assignmentsRepository.save(assignment);
      return this.findOne(saved.id);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
        throw new ConflictException('An identical assignment already exists for this user');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateAssignmentDto): Promise<AssignmentResponseDto> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID "${id}" not found`);
    }

    const newSchoolId = dto.schoolId !== undefined ? dto.schoolId : (assignment.schoolId ?? undefined);
    const newProgramId = dto.programId !== undefined ? dto.programId : (assignment.programId ?? undefined);

    if (dto.schoolId !== undefined || dto.programId !== undefined) {
      await this.validateAssignmentBusinessRules(assignment.role.code, newSchoolId, newProgramId);
    }

    if (dto.schoolId !== undefined) {
      assignment.schoolId = dto.schoolId;
    }
    if (dto.programId !== undefined) {
      assignment.programId = dto.programId;
    }
    if (dto.status !== undefined) {
      assignment.status = dto.status;
    }

    await this.assignmentsRepository.save(assignment);
    return this.findOne(id);
  }

  async deactivate(id: string): Promise<AssignmentResponseDto> {
    const assignment = await this.assignmentsRepository.findOne({ where: { id } });
    if (!assignment) {
      throw new NotFoundException(`Assignment with ID "${id}" not found`);
    }

    assignment.status = AssignmentStatus.INACTIVE;
    await this.assignmentsRepository.save(assignment);
    return this.findOne(id);
  }

  async validateAssignmentBusinessRules(
    roleCode: RoleCode,
    schoolId?: string | null,
    programId?: string | null,
  ): Promise<void> {
    const hasSchool = Boolean(schoolId);
    const hasProgram = Boolean(programId);

    switch (roleCode) {
      case RoleCode.PLATFORM_ADMIN:
        if (hasSchool || hasProgram) {
          throw new BadRequestException('platform_admin must not have schoolId or programId');
        }
        break;

      case RoleCode.SCHOOL_ADMIN:
        if (!hasSchool) {
          throw new BadRequestException('school_admin requires schoolId');
        }
        if (hasProgram) {
          throw new BadRequestException('school_admin must not have programId');
        }
        await this.ensureSchoolExists(schoolId!);
        break;

      case RoleCode.STAFF:
      case RoleCode.STUDENT:
        if (!hasSchool || !hasProgram) {
          throw new BadRequestException(`${roleCode} requires both schoolId and programId`);
        }
        await this.ensureProgramBelongsToSchool(programId!, schoolId!);
        break;

      case RoleCode.GUEST:
        if (hasProgram) {
          throw new BadRequestException('guest must not have programId');
        }
        if (hasSchool) {
          await this.ensureSchoolExists(schoolId!);
        }
        break;

      default:
        if (hasProgram && !hasSchool) {
          throw new BadRequestException('programId requires schoolId');
        }
        if (hasProgram && hasSchool) {
          await this.ensureProgramBelongsToSchool(programId!, schoolId!);
        } else if (hasSchool) {
          await this.ensureSchoolExists(schoolId!);
        }
        break;
    }
  }

  private async ensureSchoolExists(schoolId: string): Promise<void> {
    const school = await this.schoolsRepository.findOne({ where: { id: schoolId } });
    if (!school) {
      throw new NotFoundException(`School with ID "${schoolId}" not found`);
    }
  }

  private async ensureProgramBelongsToSchool(programId: string, schoolId: string): Promise<void> {
    await this.ensureSchoolExists(schoolId);
    const program = await this.programsRepository.findOne({ where: { id: programId } });
    if (!program) {
      throw new NotFoundException(`Program with ID "${programId}" not found`);
    }
    if (program.schoolId !== schoolId) {
      throw new BadRequestException(
        `Program with ID "${programId}" does not belong to school with ID "${schoolId}"`,
      );
    }
  }

  private async findDuplicate(
    userId: string,
    roleId: string,
    schoolId?: string | null,
    programId?: string | null,
  ): Promise<Assignment | null> {
    const qb = this.assignmentsRepository
      .createQueryBuilder('a')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.role_id = :roleId', { roleId });

    if (schoolId) {
      qb.andWhere('a.school_id = :schoolId', { schoolId });
    } else {
      qb.andWhere('a.school_id IS NULL');
    }

    if (programId) {
      qb.andWhere('a.program_id = :programId', { programId });
    } else {
      qb.andWhere('a.program_id IS NULL');
    }

    return qb.getOne();
  }

  private toResponseDto(assignment: Assignment): AssignmentResponseDto {
    return {
      id: assignment.id,
      user: {
        id: assignment.user?.id ?? assignment.userId,
        firstName: assignment.user?.firstName ?? '',
        lastName: assignment.user?.lastName ?? '',
        email: assignment.user?.email ?? '',
      },
      role: {
        id: assignment.role?.id ?? assignment.roleId,
        code: assignment.role?.code,
        name: assignment.role?.name,
      },
      school: assignment.school
        ? {
            id: assignment.school.id,
            name: assignment.school.name,
          }
        : null,
      program: assignment.program
        ? {
            id: assignment.program.id,
            name: assignment.program.name,
          }
        : null,
      status: assignment.status,
      createdAt:
        assignment.createdAt instanceof Date
          ? assignment.createdAt.toISOString()
          : String(assignment.createdAt),
      updatedAt:
        assignment.updatedAt instanceof Date
          ? assignment.updatedAt.toISOString()
          : String(assignment.updatedAt),
    };
  }
}
