import {
  Body,
  Controller,
  Delete,
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
  ApiNoContentResponse,
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
import { QuerySpaceMembersDto } from './dto/query-space-members.dto.js';
import { AddSpaceMemberDto } from './dto/add-space-member.dto.js';
import { SpaceMemberResponseDto, SpaceResponseDto } from './dto/space-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('spaces')
@ApiBearerAuth()
@Controller()
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get('spaces')
  @RequirePermissions('manage_spaces')
  @ApiOperation({ summary: 'Lister les espaces avec pagination et filtres' })
  @ApiOkResponse({ description: 'Liste paginée des espaces' })
  async findAll(@Query() query: QuerySpaceDto): Promise<PaginatedResponseDto<SpaceResponseDto>> {
    return this.spacesService.findAll(query);
  }

  @Get('spaces/:id')
  @RequirePermissions('manage_spaces')
  @ApiOperation({ summary: 'Obtenir le détail d un espace' })
  @ApiOkResponse({ type: SpaceResponseDto, description: 'Détail de l espace' })
  @ApiNotFoundResponse({ description: 'Espace introuvable' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SpaceResponseDto> {
    return this.spacesService.findOne(id);
  }

  @Post('schools/:schoolId/spaces')
  @RequirePermissions('manage_spaces')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un espace rattaché à une école avec une portée' })
  @ApiResponse({ status: 201, type: SpaceResponseDto, description: 'Espace créé' })
  @ApiNotFoundResponse({ description: 'École ou filière introuvable' })
  @ApiConflictResponse({ description: 'Un espace portant ce nom existe déjà dans cette école' })
  @ApiBadRequestResponse({ description: 'Données invalides ou portée/cible incohérente' })
  async create(
    @Param('schoolId', new ParseUUIDPipe()) schoolId: string,
    @Body() dto: CreateSpaceDto,
  ): Promise<SpaceResponseDto> {
    return this.spacesService.create(schoolId, dto);
  }

  @Patch('spaces/:id')
  @RequirePermissions('manage_spaces')
  @ApiOperation({ summary: 'Modifier ou désactiver un espace' })
  @ApiOkResponse({ type: SpaceResponseDto, description: 'Espace modifié' })
  @ApiNotFoundResponse({ description: 'Espace introuvable' })
  @ApiConflictResponse({
    description:
      'Nom déjà utilisé dans l école ou tentative de modifier la portée d un espace contenant des documents',
  })
  @ApiBadRequestResponse({ description: 'Données invalides ou cible incohérente' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSpaceDto,
  ): Promise<SpaceResponseDto> {
    return this.spacesService.update(id, dto);
  }

  @Get('spaces/:id/members')
  @RequirePermissions('manage_spaces')
  @ApiOperation({ summary: 'Lister les membres explicites d un espace' })
  @ApiOkResponse({ description: 'Liste paginée des membres de l espace' })
  @ApiNotFoundResponse({ description: 'Espace introuvable' })
  async listMembers(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: QuerySpaceMembersDto,
  ): Promise<PaginatedResponseDto<SpaceMemberResponseDto>> {
    return this.spacesService.listMembers(id, query);
  }

  @Post('spaces/:id/members')
  @RequirePermissions('manage_spaces')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ajouter un membre explicite à un espace' })
  @ApiResponse({ status: 201, type: SpaceMemberResponseDto, description: 'Membre ajouté' })
  @ApiNotFoundResponse({ description: 'Espace ou utilisateur introuvable (ou utilisateur hors école)' })
  @ApiConflictResponse({ description: 'L utilisateur est déjà membre de l espace' })
  async addMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddSpaceMemberDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<SpaceMemberResponseDto> {
    return this.spacesService.addMember(id, dto.userId, user?.id);
  }

  @Delete('spaces/:id/members/:userId')
  @RequirePermissions('manage_spaces')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retirer un membre d un espace' })
  @ApiNoContentResponse({ description: 'Membre retiré' })
  @ApiNotFoundResponse({ description: 'Espace ou adhésion introuvable' })
  async removeMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<void> {
    return this.spacesService.removeMember(id, userId);
  }
}
