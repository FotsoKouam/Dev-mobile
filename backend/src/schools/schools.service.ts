import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from './school.entity.js';
import { Program } from '../programs/program.entity.js';
import { CreateSchoolDto } from './dto/create-school.dto.js';
import { UpdateSchoolDto } from './dto/update-school.dto.js';
import { QuerySchoolDto } from './dto/query-school.dto.js';
import { SchoolResponseDto } from './dto/school-response.dto.js';
import { SchoolStatsResponseDto } from './dto/school-stats-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { SchoolStatus } from './enums/school-status.enum.js';
import { ProgramStatus } from '../programs/enums/program-status.enum.js';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private readonly schoolsRepository: Repository<School>,
    @InjectRepository(Program)
    private readonly programsRepository: Repository<Program>,
  ) {}

  async getStats(user?: AuthenticatedUser): Promise<SchoolStatsResponseDto> {
    if (user && !user.isPlatformAdmin && user.schoolId) {
      // Pour un school_admin, limiter les statistiques à son école
      const activeSchools = await this.schoolsRepository.count({
        where: { id: user.schoolId, status: SchoolStatus.ACTIVE },
      });
      const totalSchools = await this.schoolsRepository.count({
        where: { id: user.schoolId },
      });

      const totalPrograms = await this.programsRepository.count({
        where: { schoolId: user.schoolId },
      });
      const activePrograms = await this.programsRepository.count({
        where: { schoolId: user.schoolId, status: ProgramStatus.ACTIVE },
      });

      return {
        schools: { active: activeSchools, total: totalSchools },
        programs: { active: activePrograms, total: totalPrograms },
        users: { active: 0, total: 0 },
        institutionalSpaces: { active: 0, total: 0 },
      };
    }

    const totalSchools = await this.schoolsRepository.count();
    const activeSchools = await this.schoolsRepository.count({
      where: { status: SchoolStatus.ACTIVE },
    });

    const totalPrograms = await this.programsRepository.count();
    const activePrograms = await this.programsRepository.count({
      where: { status: ProgramStatus.ACTIVE },
    });

    return {
      schools: { active: activeSchools, total: totalSchools },
      programs: { active: activePrograms, total: totalPrograms },
      users: { active: 0, total: 0 },
      institutionalSpaces: { active: 0, total: 0 },
    };
  }

  async findAll(
    query: QuerySchoolDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<SchoolResponseDto>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const qb = this.schoolsRepository
      .createQueryBuilder('school')
      .loadRelationCountAndMap('school.programsCount', 'school.programs');

    // Périmètre school_admin
    if (user && !user.isPlatformAdmin && user.schoolId) {
      qb.andWhere('school.id = :scopedSchoolId', { scopedSchoolId: user.schoolId });
    }

    if (query.status) {
      qb.andWhere('school.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('school.type = :type', { type: query.type });
    }

    if (query.search && query.search.trim() !== '') {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(school.name) LIKE :term OR LOWER(school.city) LIKE :term)', { term });
    }

    qb.orderBy('school.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [schools, total] = await qb.getManyAndCount();

    return {
      data: schools.map((s) => this.toResponseDto(s)),
      meta: { page, limit, total },
    };
  }

  async findOne(id: string, user?: AuthenticatedUser): Promise<SchoolResponseDto> {
    if (user && !user.isPlatformAdmin && user.schoolId && user.schoolId !== id) {
      throw new ForbiddenException("Vous n'avez pas accès à cet établissement.");
    }

    const school = await this.schoolsRepository
      .createQueryBuilder('school')
      .loadRelationCountAndMap('school.programsCount', 'school.programs')
      .where('school.id = :id', { id })
      .getOne();

    if (!school) {
      throw new NotFoundException(`School with ID "${id}" not found`);
    }

    return this.toResponseDto(school);
  }

  async create(dto: CreateSchoolDto, user?: AuthenticatedUser): Promise<SchoolResponseDto> {
    if (user && !user.isPlatformAdmin) {
      throw new ForbiddenException("Seul un administrateur plateforme peut créer une école.");
    }

    const trimmedName = dto.name.trim();

    const existing = await this.schoolsRepository.findOne({
      where: { name: trimmedName },
    });
    if (existing) {
      throw new ConflictException(`School with name "${dto.name}" already exists`);
    }

    const school = this.schoolsRepository.create({
      name: trimmedName,
      type: dto.type,
      city: dto.city,
      address: dto.address,
      phone: dto.phone,
      description: dto.description,
      googleWorkspaceDomain: dto.googleWorkspaceDomain,
      mainLanguage: dto.mainLanguage ?? 'fr',
      status: SchoolStatus.ACTIVE,
    });

    try {
      const saved = await this.schoolsRepository.save(school);
      return this.toResponseDto(saved, 0);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
        throw new ConflictException(`School with name "${dto.name}" already exists`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateSchoolDto, user?: AuthenticatedUser): Promise<SchoolResponseDto> {
    if (user && !user.isPlatformAdmin && user.schoolId && user.schoolId !== id) {
      throw new ForbiddenException("Vous ne pouvez modifier que votre propre établissement.");
    }

    const school = await this.schoolsRepository.findOne({ where: { id } });
    if (!school) {
      throw new NotFoundException(`School with ID "${id}" not found`);
    }

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (trimmedName !== school.name) {
        const existing = await this.schoolsRepository.findOne({
          where: { name: trimmedName },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(`School with name "${dto.name}" already exists`);
        }
        school.name = trimmedName;
      }
    }

    if (dto.type !== undefined) school.type = dto.type;
    if (dto.city !== undefined) school.city = dto.city;
    if (dto.address !== undefined) school.address = dto.address;
    if (dto.phone !== undefined) school.phone = dto.phone;
    if (dto.description !== undefined) school.description = dto.description;
    if (dto.googleWorkspaceDomain !== undefined) school.googleWorkspaceDomain = dto.googleWorkspaceDomain;
    if (dto.mainLanguage !== undefined) school.mainLanguage = dto.mainLanguage;
    if (dto.status !== undefined) school.status = dto.status;

    try {
      await this.schoolsRepository.save(school);
      return this.findOne(id, user);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
        throw new ConflictException(`School with name "${dto.name}" already exists`);
      }
      throw err;
    }
  }

  private toResponseDto(school: School, programsCount?: number): SchoolResponseDto {
    return {
      id: school.id,
      name: school.name,
      type: school.type,
      city: school.city,
      address: school.address ?? null,
      phone: school.phone ?? null,
      description: school.description ?? null,
      googleWorkspaceDomain: school.googleWorkspaceDomain ?? null,
      mainLanguage: school.mainLanguage ?? 'fr',
      status: school.status,
      programsCount: programsCount ?? school.programsCount ?? 0,
      usersCount: 0,
      spacesCount: 0,
      createdAt: school.createdAt instanceof Date ? school.createdAt.toISOString() : String(school.createdAt),
      updatedAt: school.updatedAt instanceof Date ? school.updatedAt.toISOString() : String(school.updatedAt),
    };
  }
}
