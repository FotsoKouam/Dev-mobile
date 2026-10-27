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
import { ProgramsService } from './programs.service.js';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';
import { QueryProgramDto } from './dto/query-program.dto.js';
import { ProgramResponseDto } from './dto/program-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';

// TODO(auth): Add authentication and authorization guards when auth module is implemented
@ApiTags('programs')
@Controller()
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get('schools/:schoolId/programs')
  @ApiOperation({ summary: 'Lister les filières d une école avec pagination et filtres' })
  @ApiOkResponse({ description: 'Liste paginée des filières d une école' })
  @ApiNotFoundResponse({ description: 'École introuvable' })
  async findBySchool(
    @Param('schoolId', new ParseUUIDPipe()) schoolId: string,
    @Query() query: QueryProgramDto,
  ): Promise<PaginatedResponseDto<ProgramResponseDto>> {
    return this.programsService.findBySchool(schoolId, query);
  }

  @Post('schools/:schoolId/programs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle filière pour une école' })
  @ApiResponse({ status: 201, type: ProgramResponseDto, description: 'Filière créée' })
  @ApiNotFoundResponse({ description: 'École introuvable' })
  @ApiConflictResponse({ description: 'Une filière avec ce nom existe déjà dans cette école' })
  async create(
    @Param('schoolId', new ParseUUIDPipe()) schoolId: string,
    @Body() dto: CreateProgramDto,
  ): Promise<ProgramResponseDto> {
    return this.programsService.create(schoolId, dto);
  }

  @Get('programs/:id')
  @ApiOperation({ summary: 'Obtenir le détail d une filière' })
  @ApiOkResponse({ type: ProgramResponseDto })
  @ApiNotFoundResponse({ description: 'Filière introuvable' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<ProgramResponseDto> {
    return this.programsService.findOne(id);
  }

  @Patch('programs/:id')
  @ApiOperation({ summary: 'Modifier ou désactiver une filière' })
  @ApiOkResponse({ type: ProgramResponseDto })
  @ApiNotFoundResponse({ description: 'Filière introuvable' })
  @ApiConflictResponse({ description: 'Une filière avec ce nom existe déjà dans cette école' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProgramDto,
  ): Promise<ProgramResponseDto> {
    return this.programsService.update(id, dto);
  }
}
