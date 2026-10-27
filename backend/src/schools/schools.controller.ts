import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SchoolsService } from './schools.service.js';
import { CreateSchoolDto } from './dto/create-school.dto.js';
import { UpdateSchoolDto } from './dto/update-school.dto.js';
import { QuerySchoolDto } from './dto/query-school.dto.js';
import { SchoolResponseDto } from './dto/school-response.dto.js';
import { SchoolStatsResponseDto } from './dto/school-stats-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';

// TODO(auth): Add authentication and authorization guards when auth module is implemented
@ApiTags('schools')
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Obtenir les statistiques globales pour le tableau de bord' })
  @ApiOkResponse({ type: SchoolStatsResponseDto })
  async getStats(): Promise<SchoolStatsResponseDto> {
    return this.schoolsService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'Lister les écoles avec pagination et filtres' })
  @ApiOkResponse({ description: 'Liste paginée des écoles' })
  async findAll(@Query() query: QuerySchoolDto): Promise<PaginatedResponseDto<SchoolResponseDto>> {
    return this.schoolsService.findAll(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle école' })
  @ApiResponse({ status: 201, type: SchoolResponseDto, description: 'École créée' })
  @ApiConflictResponse({ description: 'Une école avec ce nom existe déjà' })
  async create(@Body() dto: CreateSchoolDto): Promise<SchoolResponseDto> {
    return this.schoolsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir le détail d une école' })
  @ApiOkResponse({ type: SchoolResponseDto })
  @ApiNotFoundResponse({ description: 'École introuvable' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<SchoolResponseDto> {
    return this.schoolsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier ou désactiver une école' })
  @ApiOkResponse({ type: SchoolResponseDto })
  @ApiNotFoundResponse({ description: 'École introuvable' })
  @ApiConflictResponse({ description: 'Une école avec ce nom existe déjà' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSchoolDto,
  ): Promise<SchoolResponseDto> {
    return this.schoolsService.update(id, dto);
  }
}
