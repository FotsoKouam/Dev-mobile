import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Space } from './space.entity.js';
import { Program } from '../programs/program.entity.js';
import { SpaceStatus, SpaceType } from './space.enums.js';
import { CreateSpaceDto } from './dto/create-space.dto.js';
import { UpdateSpaceDto } from './dto/update-space.dto.js';
import { QuerySpaceDto } from './dto/query-space.dto.js';
import { SpaceResponseDto } from './dto/space-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space>,
    @InjectRepository(Program)
    private readonly programsRepository: Repository<Program>,
  ) {}

  async findAll(query: QuerySpaceDto): Promise<PaginatedResponseDto<SpaceResponseDto>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const qb = this.spacesRepository
      .createQueryBuilder('space')
      .leftJoinAndSelect('space.program', 'program')
      .leftJoinAndSelect('program.school', 'school');

    if (query.status) {
      qb.andWhere('space.status = :status', { status: query.status });
    }

    if (query.programId) {
      qb.andWhere('space.programId = :programId', { programId: query.programId });
    }

    if (query.schoolId) {
      qb.andWhere('program.schoolId = :schoolId', { schoolId: query.schoolId });
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
      .leftJoinAndSelect('space.program', 'program')
      .leftJoinAndSelect('program.school', 'school')
      .where('space.id = :id', { id })
      .getOne();

    if (!space) {
      throw new NotFoundException(`Space with ID "${id}" not found`);
    }

    return this.toResponseDto(space);
  }

  async create(programId: string, dto: CreateSpaceDto): Promise<SpaceResponseDto> {
    const program = await this.programsRepository.findOne({
      where: { id: programId },
      relations: ['school'],
    });

    if (!program) {
      throw new NotFoundException(`Program with ID "${programId}" not found`);
    }

    const trimmedName = dto.name.trim();

    const existing = await this.spacesRepository.findOne({
      where: { programId, name: trimmedName },
    });

    if (existing) {
      throw new ConflictException(`A space with name "${trimmedName}" already exists in this program`);
    }

    const space = this.spacesRepository.create({
      name: trimmedName,
      description: dto.description?.trim() || null,
      type: SpaceType.INSTITUTIONAL,
      programId: program.id,
      status: SpaceStatus.ACTIVE,
    });

    try {
      const saved = await this.spacesRepository.save(space);
      return this.findOne(saved.id);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
        throw new ConflictException(`A space with name "${trimmedName}" already exists in this program`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateSpaceDto): Promise<SpaceResponseDto> {
    const space = await this.spacesRepository.findOne({
      where: { id },
    });

    if (!space) {
      throw new NotFoundException(`Space with ID "${id}" not found`);
    }

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (trimmedName !== space.name) {
        if (space.programId) {
          const existing = await this.spacesRepository.findOne({
            where: { programId: space.programId, name: trimmedName },
          });

          if (existing && existing.id !== space.id) {
            throw new ConflictException(
              `A space with name "${trimmedName}" already exists in this program`,
            );
          }
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

    try {
      await this.spacesRepository.save(space);
      return this.findOne(id);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
        throw new ConflictException('A space with this name already exists in this program');
      }
      throw err;
    }
  }

  toResponseDto(space: Space): SpaceResponseDto {
    const school = space.program?.school;
    return {
      id: space.id,
      name: space.name,
      description: space.description ?? null,
      type: space.type,
      status: space.status,
      school: {
        id: school?.id ?? '',
        name: school?.name ?? '',
      },
      program: {
        id: space.program?.id ?? space.programId ?? '',
        name: space.program?.name ?? '',
      },
      createdAt: space.createdAt instanceof Date ? space.createdAt.toISOString() : String(space.createdAt),
      updatedAt: space.updatedAt instanceof Date ? space.updatedAt.toISOString() : String(space.updatedAt),
    };
  }
}
