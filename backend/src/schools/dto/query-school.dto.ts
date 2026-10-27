import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SchoolType } from '../enums/school-type.enum.js';
import { SchoolStatus } from '../enums/school-status.enum.js';

export class QuerySchoolDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Numéro de la page (commence à 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    maximum: 100,
    description: 'Nombre d éléments par page (maximum 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: SchoolStatus,
    description: 'Filtrer par statut',
  })
  @IsOptional()
  @IsEnum(SchoolStatus)
  status?: SchoolStatus;

  @ApiPropertyOptional({
    enum: SchoolType,
    description: 'Filtrer par type (public ou private)',
  })
  @IsOptional()
  @IsEnum(SchoolType)
  type?: SchoolType;

  @ApiPropertyOptional({
    description: 'Recherche par nom ou ville',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
