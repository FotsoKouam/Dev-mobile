import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { SpaceStatus } from '../space.enums.js';

export class UpdateSpaceDto {
  @ApiPropertyOptional({
    example: 'Graphes et algorithmes appliqués',
    description: 'Nouveau nom de l\'espace (2 à 150 caractères)',
    minLength: 2,
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @ApiPropertyOptional({
    example: 'Description mise à jour',
    description: 'Nouvelle description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: SpaceStatus,
    example: SpaceStatus.ACTIVE,
    description: 'Statut de l\'espace (active ou inactive)',
  })
  @IsOptional()
  @IsEnum(SpaceStatus)
  status?: SpaceStatus;
}

