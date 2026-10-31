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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesService } from './roles.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { QueryRoleDto } from './dto/query-role.dto.js';
import { RoleResponseDto } from './dto/role-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';

// TODO(auth): Add authentication and authorization guards when auth module is implemented
@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les rôles avec pagination et filtres' })
  @ApiOkResponse({ description: 'Liste paginée des rôles' })
  async findAll(@Query() query: QueryRoleDto): Promise<PaginatedResponseDto<RoleResponseDto>> {
    return this.rolesService.findAll(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un rôle personnalisé' })
  @ApiResponse({ status: 201, type: RoleResponseDto, description: 'Rôle créé' })
  async create(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir le détail d un rôle avec ses permissions' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse({ description: 'Rôle introuvable' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<RoleResponseDto> {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un rôle personnalisé' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse({ description: 'Rôle introuvable' })
  @ApiForbiddenResponse({ description: 'Impossible de modifier un rôle système' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(id, dto);
  }
}
