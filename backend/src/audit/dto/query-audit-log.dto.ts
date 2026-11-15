import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { AuditActionQuery, AuditResult, AuditTarget } from '../audit.enums.js';

export class QueryAuditLogDto {
  @ApiPropertyOptional({ description: 'Numéro de page', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Nombre d éléments par page', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({ description: 'Date de début au format ISO 8601 UTC' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Date de fin au format ISO 8601 UTC' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Action', enum: AuditActionQuery })
  @IsOptional()
  @IsEnum(AuditActionQuery)
  action?: AuditActionQuery;

  @ApiPropertyOptional({ description: 'Résultat', enum: AuditResult })
  @IsOptional()
  @IsEnum(AuditResult)
  result?: AuditResult;

  @ApiPropertyOptional({ description: 'Cible', enum: AuditTarget })
  @IsOptional()
  @IsEnum(AuditTarget)
  target?: AuditTarget;

  @ApiPropertyOptional({ description: 'Identifiant de l utilisateur' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Recherche insensible à la casse sur l email, le nom ou l IP' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class QueryAuditStatsDto {
  @ApiPropertyOptional({ description: 'Date de début au format ISO 8601 UTC' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Date de fin au format ISO 8601 UTC' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
