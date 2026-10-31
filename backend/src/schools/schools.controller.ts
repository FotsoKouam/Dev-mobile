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
  ApiBearerAuth,
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
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('schools')
@ApiBearerAuth()
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get('stats')
  @RequirePermissions('manage_schools')
  @ApiOperation({ summary: 'Obtenir les statistiques globales pour le tableau de bord' })
  @ApiOkResponse({ type: SchoolStatsResponseDto })
  async getStats(@CurrentUser() user: AuthenticatedUser): Promise<SchoolStatsResponseDto> {
    return this.schoolsService.getStats(user);
  }

  @Get()
  @RequirePermissions('manage_schools')
  @ApiOperation({ summary: 'Lister les écoles avec pagination et filtres' })
  @ApiOkResponse({ description: 'Liste paginée des écoles' })
  async findAll(
    @Query() query: QuerySchoolDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<SchoolResponseDto>> {
    return this.schoolsService.findAll(query, user);
  }

  @Post()
  @RequirePermissions('manage_schools')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle école' })
  @ApiResponse({ status: 201, type: SchoolResponseDto, description: 'École créée' })
  @ApiConflictResponse({ description: 'Une école avec ce nom existe déjà' })
  async create(
    @Body() dto: CreateSchoolDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SchoolResponseDto> {
    return this.schoolsService.create(dto, user);
  }

  @Get(':id')
  @RequirePermissions('manage_schools')
  @ApiOperation({ summary: 'Obtenir le détail d une école' })
  @ApiOkResponse({ type: SchoolResponseDto })
  @ApiNotFoundResponse({ description: 'École introuvable' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SchoolResponseDto> {
    return this.schoolsService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermissions('manage_schools')
  @ApiOperation({ summary: 'Modifier ou désactiver une école' })
  @ApiOkResponse({ type: SchoolResponseDto })
  @ApiNotFoundResponse({ description: 'École introuvable' })
  @ApiConflictResponse({ description: 'Une école avec ce nom existe déjà' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSchoolDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SchoolResponseDto> {
    return this.schoolsService.update(id, dto, user);
  }
}
