import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuditService } from './audit.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { QueryAuditLogDto, QueryAuditStatsDto } from './dto/query-audit-log.dto.js';
import { AuditLogResponseDto } from './dto/audit-log-response.dto.js';
import { AuditStatsResponseDto } from './dto/audit-stats-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('stats')
  @RequirePermissions('view_audit_log')
  @ApiOperation({ summary: 'Obtenir les compteurs d événements d audit sur une période' })
  @ApiOkResponse({ type: AuditStatsResponseDto, description: 'Compteurs retournés' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @ApiForbiddenResponse({ description: 'Permission view_audit_log requise' })
  async getStats(
    @Query() query: QueryAuditStatsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AuditStatsResponseDto> {
    return this.auditService.getStats(query, user);
  }

  @Get()
  @RequirePermissions('view_audit_log')
  @ApiOperation({ summary: 'Lister les événements d audit avec filtres et pagination' })
  @ApiOkResponse({ description: 'Liste paginée des événements d audit' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @ApiForbiddenResponse({ description: 'Permission view_audit_log requise' })
  async findAll(
    @Query() query: QueryAuditLogDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    return this.auditService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions('view_audit_log')
  @ApiOperation({ summary: 'Obtenir le détail d un événement d audit' })
  @ApiOkResponse({ type: AuditLogResponseDto, description: 'Détail de l événement' })
  @ApiNotFoundResponse({ description: 'Événement d audit introuvable' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @ApiForbiddenResponse({ description: 'Permission view_audit_log requise' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AuditLogResponseDto> {
    return this.auditService.findOne(id, user);
  }
}
