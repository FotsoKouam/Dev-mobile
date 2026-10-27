import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Program } from './program.entity.js';
import { School } from '../schools/school.entity.js';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';
import { QueryProgramDto } from './dto/query-program.dto.js';
import { ProgramResponseDto } from './dto/program-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { ProgramStatus } from './enums/program-status.enum.js';

@Injectable()
export class ProgramsService {
  constructor(
    @InjectRepository(Program)
    private readonly programsRepository: Repository<Program>,
    @InjectRepository(School)
    private readonly schoolsRepository: Repository<School>,
  ) {}

  async findBySchool(
    schoolId: string,
    query: QueryProgramDto,
  ): Promise<PaginatedResponseDto<ProgramResponseDto>> {
    const school = await this.schoolsRepository.findOne({ where: { id: schoolId } });
    if (!school) {
      throw new NotFoundException(`School with ID "${schoolId}" not found`);
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const qb = this.programsRepository
      .createQueryBuilder('program')
      .where('program.school_id = :schoolId', { schoolId });

    if (query.status) {
      qb.andWhere('program.status = :status', { status: query.status });
    }

    if (query.search && query.search.trim() !== '') {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere('LOWER(program.name) LIKE :term', { term });
    }

    qb.orderBy('program.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [programs, total] = await qb.getManyAndCount();

    return {
      data: programs.map((p) => this.toResponseDto(p)),
      meta: { page, limit, total },
    };
  }

  async findOne(id: string): Promise<ProgramResponseDto> {
    const program = await this.programsRepository.findOne({ where: { id } });
    if (!program) {
      throw new NotFoundException(`Program with ID "${id}" not found`);
    }

    return this.toResponseDto(program);
  }

  async create(schoolId: string, dto: CreateProgramDto): Promise<ProgramResponseDto> {
    const school = await this.schoolsRepository.findOne({ where: { id: schoolId } });
    if (!school) {
      throw new NotFoundException(`School with ID "${schoolId}" not found`);
    }

    const trimmedName = dto.name.trim();

    const existing = await this.programsRepository.findOne({
      where: { schoolId, name: trimmedName },
    });
    if (existing) {
      throw new ConflictException(
        `Program with name "${dto.name}" already exists in this school`,
      );
    }

    const program = this.programsRepository.create({
      name: trimmedName,
      description: dto.description,
      schoolId,
      status: ProgramStatus.ACTIVE,
    });

    try {
      const saved = await this.programsRepository.save(program);
      return this.toResponseDto(saved);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
        throw new ConflictException(
          `Program with name "${dto.name}" already exists in this school`,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateProgramDto): Promise<ProgramResponseDto> {
    const program = await this.programsRepository.findOne({ where: { id } });
    if (!program) {
      throw new NotFoundException(`Program with ID "${id}" not found`);
    }

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (trimmedName !== program.name) {
        const existing = await this.programsRepository.findOne({
          where: { schoolId: program.schoolId, name: trimmedName },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `Program with name "${dto.name}" already exists in this school`,
          );
        }
        program.name = trimmedName;
      }
    }

    if (dto.description !== undefined) {
      program.description = dto.description;
    }

    if (dto.status !== undefined) {
      program.status = dto.status;
    }

    try {
      const saved = await this.programsRepository.save(program);
      return this.toResponseDto(saved);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
        throw new ConflictException(
          `Program with name "${dto.name}" already exists in this school`,
        );
      }
      throw err;
    }
  }

  private toResponseDto(program: Program): ProgramResponseDto {
    return {
      id: program.id,
      schoolId: program.schoolId,
      name: program.name,
      description: program.description ?? null,
      status: program.status,
      // TODO: calculate from users module when implemented
      usersCount: 0,
      // TODO: calculate from spaces module when implemented
      spacesCount: 0,
      createdAt: program.createdAt instanceof Date ? program.createdAt.toISOString() : String(program.createdAt),
      updatedAt: program.updatedAt instanceof Date ? program.updatedAt.toISOString() : String(program.updatedAt),
    };
  }
}
