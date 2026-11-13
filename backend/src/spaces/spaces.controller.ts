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
import { SpacesService } from './spaces.service.js';
import { CreateSpaceDto } from './dto/create-space.dto.js';
import { UpdateSpaceDto } from './dto/update-space.dto.js';
import { QuerySpaceDto } from './dto/query-space.dto.js';
import { SpaceResponseDto } from './dto/space-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';

@ApiTags('spaces')
@ApiBearerAuth()
@Controller()
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get('spaces')
  @RequirePermissions('manage_programs')
  @ApiOperation({ summary: 'Lister les espaces avec pagination et filtres' })
  @ApiOkResponse({ description: 'Liste paginée des espaces' })
  async findAll(@Query() query: QuerySpaceDto): Promise<PaginatedResponseDto<SpaceResponseDto>> {
    return this.spacesService.findAll(query);
  }

  @Get('spaces/:id')
  @RequirePermissions('manage_programs')
  @ApiOperation({ summary: 'Obtenir le détail d un espace' })
  @ApiOkResponse({ type: SpaceResponseDto, description: 'Détail de l espace' })
  @ApiNotFoundResponse({ description: 'Espace introuvable' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SpaceResponseDto> {
    return this.spacesService.findOne(id);
  }

  @Post('programs/:programId/spaces')
  @RequirePermissions('create_institutional_space')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un espace institutionnel rattaché à une filière' })
  @ApiResponse({ status: 201, type: SpaceResponseDto, description: 'Espace créé' })
  @ApiNotFoundResponse({ description: 'Filière introuvable' })
  @ApiConflictResponse({ description: 'Un espace portant ce nom existe déjà dans cette filière' })
  @ApiBadRequestResponse({ description: 'Données invalides ou présence d un champ type dans le corps' })
  async create(
    @Param('programId', new ParseUUIDPipe()) programId: string,
    @Body() dto: CreateSpaceDto,
  ): Promise<SpaceResponseDto> {
    return this.spacesService.create(programId, dto);
  }

  @Patch('spaces/:id')
  @RequirePermissions('create_institutional_space')
  @ApiOperation({ summary: 'Modifier ou désactiver un espace' })
  @ApiOkResponse({ type: SpaceResponseDto, description: 'Espace modifié' })
  @ApiNotFoundResponse({ description: 'Espace introuvable' })
  @ApiConflictResponse({ description: 'Un espace portant ce nom existe déjà dans cette filière' })
  @ApiBadRequestResponse({ description: 'Données invalides ou présence d un champ interdit' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSpaceDto,
  ): Promise<SpaceResponseDto> {
    return this.spacesService.update(id, dto);
  }
}

