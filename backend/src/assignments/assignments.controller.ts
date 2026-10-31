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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { UpdateAssignmentDto } from './dto/update-assignment.dto.js';
import { QueryAssignmentDto } from './dto/query-assignment.dto.js';
import { AssignmentResponseDto } from './dto/assignment-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';

@ApiTags('assignments')
@ApiBearerAuth()
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  @RequirePermissions('manage_assignments')
  @ApiOperation({ summary: 'Lister les affectations avec pagination et filtres' })
  @ApiOkResponse({ description: 'Liste paginée des affectations' })
  async findAll(
    @Query() query: QueryAssignmentDto,
  ): Promise<PaginatedResponseDto<AssignmentResponseDto>> {
    return this.assignmentsService.findAll(query);
  }

  @Post()
  @RequirePermissions('manage_assignments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une affectation' })
  @ApiResponse({ status: 201, type: AssignmentResponseDto, description: 'Affectation créée' })
  @ApiBadRequestResponse({ description: 'Incohérence rôle / école / filière' })
  @ApiConflictResponse({ description: 'Affectation identique déjà existante' })
  async create(@Body() dto: CreateAssignmentDto): Promise<AssignmentResponseDto> {
    return this.assignmentsService.create(dto);
  }

  @Get(':id')
  @RequirePermissions('manage_assignments')
  @ApiOperation({ summary: 'Obtenir le détail d une affectation' })
  @ApiOkResponse({ type: AssignmentResponseDto })
  @ApiNotFoundResponse({ description: 'Affectation introuvable' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<AssignmentResponseDto> {
    return this.assignmentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('manage_assignments')
  @ApiOperation({ summary: 'Modifier une affectation' })
  @ApiOkResponse({ type: AssignmentResponseDto })
  @ApiBadRequestResponse({ description: 'Incohérence rôle / école / filière' })
  @ApiNotFoundResponse({ description: 'Affectation introuvable' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAssignmentDto,
  ): Promise<AssignmentResponseDto> {
    return this.assignmentsService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('manage_assignments')
  @ApiOperation({ summary: 'Désactiver une affectation (status: inactive)' })
  @ApiOkResponse({ type: AssignmentResponseDto })
  @ApiNotFoundResponse({ description: 'Affectation introuvable' })
  async deactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AssignmentResponseDto> {
    return this.assignmentsService.deactivate(id);
  }
}
