import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccessibleSpaceScopeDto {
  @ApiProperty({ example: 'program', enum: ['all', 'school', 'program', 'shared'] })
  scope: 'all' | 'school' | 'program' | 'shared';

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', nullable: true })
  schoolId?: string | null;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', nullable: true })
  programId?: string | null;

  @ApiProperty({ example: [], description: 'Liste des espaces accessibles (vide tant que le module Space n\'est pas créé)' })
  spaces: string[];
}
