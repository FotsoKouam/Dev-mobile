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
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UserStatsResponseDto } from './dto/user-stats-response.dto.js';
import { AccessibleSpaceScopeDto } from './dto/accessible-spaces-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('stats')
  @RequirePermissions('manage_users')
  @ApiOperation({ summary: 'Obtenir les statistiques utilisateurs pour le tableau de bord' })
  @ApiOkResponse({ type: UserStatsResponseDto })
  async getStats(): Promise<UserStatsResponseDto> {
    return this.usersService.getStats();
  }

  @Get()
  @RequirePermissions('manage_users')
  @ApiOperation({ summary: 'Lister les utilisateurs avec pagination et filtres' })
  @ApiOkResponse({ description: 'Liste paginée des utilisateurs' })
  async findAll(@Query() query: QueryUserDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    return this.usersService.findAll(query);
  }

  @Post()
  @RequirePermissions('manage_users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inviter un utilisateur' })
  @ApiResponse({ status: 201, type: UserResponseDto, description: 'Utilisateur créé/invité' })
  @ApiConflictResponse({ description: 'Un utilisateur avec cet email existe déjà' })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @RequirePermissions('manage_users')
  @ApiOperation({ summary: 'Obtenir le détail d un utilisateur avec ses affectations' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur introuvable' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('manage_users')
  @ApiOperation({ summary: 'Modifier ou changer le statut d un utilisateur' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur introuvable' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Get(':userId/accessible-spaces')
  @RequirePermissions('manage_users')
  @ApiOperation({
    summary: 'Calculer le périmètre des espaces accessibles d un utilisateur',
    description:
      'Renvoie la liste des périmètres calculés (scope: all, school, program, shared) selon les affectations actives.',
  })
  @ApiOkResponse({ type: [AccessibleSpaceScopeDto] })
  @ApiNotFoundResponse({ description: 'Utilisateur introuvable' })
  async getAccessibleSpaces(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<AccessibleSpaceScopeDto[]> {
    return this.usersService.getAccessibleSpaces(userId);
  }
}
