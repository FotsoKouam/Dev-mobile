import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Length, ValidateIf } from 'class-validator';
import { SpaceScope } from '../space.enums.js';

export class CreateSpaceDto {
  @ApiProperty({
    example: 'Graphes et algorithmes',
    description: 'Nom de l\'espace (2 à 150 caractères)',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @Length(2, 150)
  name: string;

  @ApiPropertyOptional({
    example: 'Cours et exercices de graphes et algorithmique avancée',
    description: 'Description facultative de l\'espace',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: SpaceScope,
    example: SpaceScope.PROGRAM,
    description: 'Portée de l\'espace (school, program, role, individual)',
  })
  @IsEnum(SpaceScope)
  scope: SpaceScope;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Identifiant de la filière cible (obligatoire si scope = program, interdit sinon)',
  })
  @ValidateIf((o: CreateSpaceDto) => o.scope === SpaceScope.PROGRAM)
  @IsNotEmpty({ message: 'programId est obligatoire lorsque scope = program' })
  @IsUUID('all', { message: 'programId doit être un UUID valide' })
  programId?: string;

  @ApiPropertyOptional({
    example: 'staff',
    description: 'Code du rôle cible (obligatoire si scope = role, interdit sinon)',
  })
  @ValidateIf((o: CreateSpaceDto) => o.scope === SpaceScope.ROLE)
  @IsNotEmpty({ message: 'roleCode est obligatoire lorsque scope = role' })
  @IsString()
  roleCode?: string;
}
