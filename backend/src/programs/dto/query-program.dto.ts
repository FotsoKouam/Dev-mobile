import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ProgramStatus } from '../enums/program-status.enum.js';

export class QueryProgramDto {
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
    enum: ProgramStatus,
    description: 'Filtrer par statut (active ou inactive)',
  })
  @IsOptional()
  @IsEnum(ProgramStatus)
  status?: ProgramStatus;

  @ApiPropertyOptional({
    description: 'Recherche par nom de filière',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
