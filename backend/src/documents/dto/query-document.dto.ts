import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { DocumentFileType, DocumentStatus } from '../document.enums.js';

export class QueryDocumentDto {
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

  @ApiPropertyOptional({ description: 'Filtrer par identifiant d espace' })
  @IsOptional()
  @IsUUID()
  spaceId?: string;

  @ApiPropertyOptional({ description: 'Filtrer par identifiant de filière' })
  @IsOptional()
  @IsUUID()
  programId?: string;

  @ApiPropertyOptional({ description: 'Filtrer par identifiant d école' })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiPropertyOptional({ description: 'Filtrer par statut', enum: DocumentStatus })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'Filtrer par type de fichier', enum: DocumentFileType })
  @IsOptional()
  @IsEnum(DocumentFileType)
  fileType?: DocumentFileType;

  @ApiPropertyOptional({ description: 'Recherche insensible à la casse sur le nom du document' })
  @IsOptional()
  @IsString()
  search?: string;
}
