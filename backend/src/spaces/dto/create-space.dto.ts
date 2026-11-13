import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

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
}

