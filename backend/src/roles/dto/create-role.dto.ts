import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ALL_PERMISSION_CODES } from '../permissions.constant.js';

export class CreateRoleDto {
  @ApiProperty({
    example: 'Responsable pédagogique',
    description: 'Nom affiché du rôle',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    example: 'Gestion du contenu pédagogique d\'une filière',
    description: 'Description du rôle (facultatif)',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: ['add_document', 'replace_or_delete_document'],
    description: `Codes des permissions à attribuer. Valeurs possibles : ${ALL_PERMISSION_CODES.join(', ')}`,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions?: string[];
}
