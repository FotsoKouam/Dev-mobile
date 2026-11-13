import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { SpaceStatus } from '../space.enums.js';

export class QuerySpaceDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Numéro de page (commence à 1)',
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
    description: 'Recherche insensible à la casse sur le nom',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Filtrer par école (via sa filière)',
  })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Filtrer par filière',
  })
  @IsOptional()
  @IsUUID()
  programId?: string;

  @ApiPropertyOptional({
    enum: SpaceStatus,
    description: 'Filtrer par statut (active ou inactive)',
  })
  @IsOptional()
  @IsEnum(SpaceStatus)
  status?: SpaceStatus;
}

