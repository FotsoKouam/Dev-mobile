import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { SpaceScope, SpaceStatus } from '../space.enums.js';

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

  @ApiPropertyOptional({
    enum: SpaceScope,
    example: SpaceScope.SCHOOL,
    description: 'Nouvelle portée de l\'espace (modifiable uniquement si aucun document n\'est rattaché)',
  })
  @IsOptional()
  @IsEnum(SpaceScope)
  scope?: SpaceScope;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Identifiant de la filière si scope = program',
  })
  @IsOptional()
  @IsUUID('all', { message: 'programId doit être un UUID valide' })
  programId?: string;

  @ApiPropertyOptional({
    example: 'staff',
    description: 'Code du rôle si scope = role',
  })
  @IsOptional()
  @IsString()
  roleCode?: string;
}
