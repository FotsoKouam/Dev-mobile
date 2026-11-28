import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Space } from './space.entity.js';
import { SpaceMember } from './space-member.entity.js';
import { School } from '../schools/school.entity.js';
import { Program } from '../programs/program.entity.js';
import { User } from '../users/user.entity.js';
import { Document } from '../documents/document.entity.js';
import { Assignment } from '../assignments/assignment.entity.js';
import { SpaceScope, SpaceStatus } from './space.enums.js';
import { CreateSpaceDto } from './dto/create-space.dto.js';
import { UpdateSpaceDto } from './dto/update-space.dto.js';
import { QuerySpaceDto } from './dto/query-space.dto.js';
import { QuerySpaceMembersDto } from './dto/query-space-members.dto.js';
import { SpaceMemberResponseDto, SpaceResponseDto } from './dto/space-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space>,
    @InjectRepository(SpaceMember)
    private readonly spaceMembersRepository: Repository<SpaceMember>,
    @InjectRepository(School)
    private readonly schoolsRepository: Repository<School>,
    @InjectRepository(Program)
    private readonly programsRepository: Repository<Program>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Document)
    private readonly documentsRepository: Repository<Document>,
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
  ) {}

  async findAll(query: QuerySpaceDto): Promise<PaginatedResponseDto<SpaceResponseDto>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const qb = this.spacesRepository
      .createQueryBuilder('space')
      .leftJoinAndSelect('space.school', 'school')
      .leftJoinAndSelect('space.scopeProgram', 'scopeProgram');

    if (query.status) {
      qb.andWhere('space.status = :status', { status: query.status });
    }

    if (query.schoolId) {
      qb.andWhere('space.schoolId = :schoolId', { schoolId: query.schoolId });
    }

    if (query.scope) {
      qb.andWhere('space.scope = :scope', { scope: query.scope });
    }

    if (query.search && query.search.trim() !== '') {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere('LOWER(space.name) LIKE :term', { term });
    }

    qb.orderBy('space.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [spaces, total] = await qb.getManyAndCount();

    return {
      data: spaces.map((s) => this.toResponseDto(s)),
      meta: { page, limit, total },
    };
  }

  async findOne(id: string): Promise<SpaceResponseDto> {
    const space = await this.spacesRepository
      .createQueryBuilder('space')
      .leftJoinAndSelect('space.school', 'school')
      .leftJoinAndSelect('space.scopeProgram', 'scopeProgram')
      .where('space.id = :id', { id })
      .getOne();

    if (!space) {
      throw new NotFoundException(`Space with ID "${id}" not found`);
    }

    return this.toResponseDto(space);
  }

  async create(schoolId: string, dto: CreateSpaceDto): Promise<SpaceResponseDto> {
    const school = await this.schoolsRepository.findOne({ where: { id: schoolId } });
    if (!school) {
      throw new NotFoundException(`School with ID "${schoolId}" not found`);
    }

    const trimmedName = dto.name.trim();

    // Vérifier doublon (schoolId, name)
    const existing = await this.spacesRepository.findOne({
      where: { schoolId, name: trimmedName },
    });
    if (existing) {
      throw new ConflictException(`A space with name "${trimmedName}" already exists in this school`);
    }

    // Validation de la portée et des cibles
    let scopeProgram: Program | null = null;
    let scopeProgramId: string | null = null;
    let scopeRoleCode: string | null = null;

    if (dto.scope === SpaceScope.PROGRAM) {
      if (!dto.programId) {
        throw new BadRequestException('programId is required when scope is "program"');
      }
      if (dto.roleCode) {
        throw new BadRequestException('roleCode must be null when scope is "program"');
      }
      scopeProgram = await this.programsRepository.findOne({
        where: { id: dto.programId },
      });
      if (!scopeProgram) {
        throw new NotFoundException(`Program with ID "${dto.programId}" not found`);
      }
      if (scopeProgram.schoolId !== schoolId) {
        throw new BadRequestException('Program does not belong to the specified school');
      }
      scopeProgramId = scopeProgram.id;
    } else if (dto.scope === SpaceScope.ROLE) {
      if (!dto.roleCode || dto.roleCode.trim() === '') {
        throw new BadRequestException('roleCode is required when scope is "role"');
      }
      if (dto.programId) {
        throw new BadRequestException('programId must be null when scope is "role"');
      }
      const validRoleCodes = ['platform_admin', 'school_admin', 'staff', 'admin_staff', 'student', 'guest'];
      if (!validRoleCodes.includes(dto.roleCode.trim())) {
        throw new BadRequestException(`Invalid roleCode "${dto.roleCode}"`);
      }
      scopeRoleCode = dto.roleCode.trim();
    } else if (dto.scope === SpaceScope.SCHOOL || dto.scope === SpaceScope.INDIVIDUAL) {
      if (dto.programId || dto.roleCode) {
        throw new BadRequestException(`Target is not allowed when scope is "${dto.scope}"`);
      }
    }

    const space = this.spacesRepository.create({
      name: trimmedName,
      description: dto.description ? dto.description.trim() : null,
      schoolId,
      school,
      scope: dto.scope,
      scopeProgramId,
      scopeProgram,
      scopeRoleCode,
      status: SpaceStatus.ACTIVE,
    });

    const saved = await this.spacesRepository.save(space);
    return this.toResponseDto(saved);
  }

  async update(id: string, dto: UpdateSpaceDto): Promise<SpaceResponseDto> {
    const space = await this.spacesRepository
      .createQueryBuilder('space')
      .leftJoinAndSelect('space.school', 'school')
      .leftJoinAndSelect('space.scopeProgram', 'scopeProgram')
      .where('space.id = :id', { id })
      .getOne();

    if (!space) {
      throw new NotFoundException(`Space with ID "${id}" not found`);
    }

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (trimmedName !== space.name) {
        const existing = await this.spacesRepository.findOne({
          where: { schoolId: space.schoolId, name: trimmedName },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(`A space with name "${trimmedName}" already exists in this school`);
        }
        space.name = trimmedName;
      }
    }

    if (dto.description !== undefined) {
      space.description = dto.description ? dto.description.trim() : null;
    }

    if (dto.status !== undefined) {
      space.status = dto.status;
    }

    // Modification de la portée : autorisée UNIQUEMENT si aucun document n'est rattaché
    if (dto.scope !== undefined) {
      const documentCount = await this.documentsRepository.count({
        where: { spaceId: id },
      });
      if (documentCount > 0) {
        throw new ConflictException('Cannot change scope of a space that already contains documents');
      }

      if (dto.scope === SpaceScope.PROGRAM) {
        const targetProgramId = dto.programId || space.scopeProgramId;
        if (!targetProgramId) {
          throw new BadRequestException('programId is required when scope is "program"');
        }
        const prog = await this.programsRepository.findOne({ where: { id: targetProgramId } });
        if (!prog) {
          throw new NotFoundException(`Program with ID "${targetProgramId}" not found`);
        }
        if (prog.schoolId !== space.schoolId) {
          throw new BadRequestException('Program does not belong to the space school');
        }
        space.scope = dto.scope;
        space.scopeProgramId = prog.id;
        space.scopeProgram = prog;
        space.scopeRoleCode = null;
      } else if (dto.scope === SpaceScope.ROLE) {
        const targetRoleCode = dto.roleCode || space.scopeRoleCode;
        if (!targetRoleCode || targetRoleCode.trim() === '') {
          throw new BadRequestException('roleCode is required when scope is "role"');
        }
        const validRoleCodes = ['platform_admin', 'school_admin', 'staff', 'admin_staff', 'student', 'guest'];
        if (!validRoleCodes.includes(targetRoleCode.trim())) {
          throw new BadRequestException(`Invalid roleCode "${targetRoleCode}"`);
        }
        space.scope = dto.scope;
        space.scopeRoleCode = targetRoleCode.trim();
        space.scopeProgramId = null;
        space.scopeProgram = null;
      } else if (dto.scope === SpaceScope.SCHOOL || dto.scope === SpaceScope.INDIVIDUAL) {
        if (dto.programId || dto.roleCode) {
          throw new BadRequestException(`Target is not allowed when scope is "${dto.scope}"`);
        }
        space.scope = dto.scope;
        space.scopeProgramId = null;
        space.scopeProgram = null;
        space.scopeRoleCode = null;
      }
    }

    const saved = await this.spacesRepository.save(space);
    return this.toResponseDto(saved);
  }

  async addMember(
    spaceId: string,
    userId: string,
    createdById?: string,
  ): Promise<SpaceMemberResponseDto> {
    const space = await this.spacesRepository.findOne({ where: { id: spaceId } });
    if (!space) {
      throw new NotFoundException(`Space with ID "${spaceId}" not found`);
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    // Vérifier que l'utilisateur appartient à la même école via ses affectations actives
    const userAssignments = await this.assignmentsRepository.find({
      where: { userId, status: 'active' as any },
    });

    const isMemberOfSchool = userAssignments.some((a) => a.schoolId === space.schoolId);
    if (!isMemberOfSchool) {
      throw new NotFoundException(
        `User "${userId}" does not have an active assignment in the school of space "${spaceId}"`,
      );
    }

    const existingMember = await this.spaceMembersRepository.findOne({
      where: { spaceId, userId },
    });
    if (existingMember) {
      throw new ConflictException(`User "${userId}" is already a member of space "${spaceId}"`);
    }

    const member = this.spaceMembersRepository.create({
      spaceId,
      space,
      userId,
      user,
      createdById: createdById ?? null,
    });

    const saved = await this.spaceMembersRepository.save(member);
    return this.toMemberResponseDto(saved, user);
  }

  async removeMember(spaceId: string, userId: string): Promise<void> {
    const space = await this.spacesRepository.findOne({ where: { id: spaceId } });
    if (!space) {
      throw new NotFoundException(`Space with ID "${spaceId}" not found`);
    }

    const member = await this.spaceMembersRepository.findOne({
      where: { spaceId, userId },
    });
    if (!member) {
      throw new NotFoundException(`Membership for user "${userId}" in space "${spaceId}" not found`);
    }

    await this.spaceMembersRepository.remove(member);
  }

  async listMembers(
    spaceId: string,
    query: QuerySpaceMembersDto,
  ): Promise<PaginatedResponseDto<SpaceMemberResponseDto>> {
    const space = await this.spacesRepository.findOne({ where: { id: spaceId } });
    if (!space) {
      throw new NotFoundException(`Space with ID "${spaceId}" not found`);
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const qb = this.spaceMembersRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.spaceId = :spaceId', { spaceId })
      .orderBy('member.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [members, total] = await qb.getManyAndCount();

    return {
      data: members.map((m) => this.toMemberResponseDto(m, m.user)),
      meta: { page, limit, total },
    };
  }

  private toResponseDto(space: Space): SpaceResponseDto {
    return {
      id: space.id,
      name: space.name,
      description: space.description ?? null,
      scope: space.scope,
      scopeProgramId: space.scopeProgramId ?? null,
      scopeProgram: space.scopeProgram
        ? { id: space.scopeProgram.id, name: space.scopeProgram.name }
        : null,
      scopeRoleCode: space.scopeRoleCode ?? null,
      status: space.status,
      school: space.school
        ? { id: space.school.id, name: space.school.name }
        : { id: space.schoolId, name: '' },
      createdAt: space.createdAt instanceof Date ? space.createdAt.toISOString() : String(space.createdAt),
      updatedAt: space.updatedAt instanceof Date ? space.updatedAt.toISOString() : String(space.updatedAt),
    };
  }

  private toMemberResponseDto(member: SpaceMember, user: User): SpaceMemberResponseDto {
    return {
      id: member.id,
      spaceId: member.spaceId,
      userId: member.userId,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      createdById: member.createdById ?? null,
      createdAt: member.createdAt instanceof Date ? member.createdAt.toISOString() : String(member.createdAt),
      updatedAt: member.updatedAt instanceof Date ? member.updatedAt.toISOString() : String(member.updatedAt),
    };
  }
}
