import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RoleStatus } from '../enums/role-status.enum.js';

export class QueryRoleDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: RoleStatus, description: 'Filtrer par statut' })
  @IsOptional()
  @IsEnum(RoleStatus)
  status?: RoleStatus;

  @ApiPropertyOptional({
    enum: ['system', 'custom'],
    description: 'Filtrer par type : system (isSystem=true) ou custom (isSystem=false)',
  })
  @IsOptional()
  @IsString()
  type?: 'system' | 'custom';
}
