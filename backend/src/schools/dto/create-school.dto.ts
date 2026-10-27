import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SchoolType } from '../enums/school-type.enum.js';

export class CreateSchoolDto {
  @ApiProperty({
    example: 'Institut Universitaire Saint Jean',
    description: 'Nom unique de l établissement',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiProperty({
    enum: SchoolType,
    example: SchoolType.PRIVATE,
    description: 'Type d établissement (public ou private)',
  })
  @IsEnum(SchoolType)
  type: SchoolType;

  @ApiProperty({
    example: 'Yaoundé',
    description: 'Ville de l établissement',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({
    example: 'Quartier Mvolyé',
    description: 'Adresse physique de l établissement',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: '+237 222 00 00 00',
    description: 'Numéro de téléphone de contact',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'Établissement privé d enseignement supérieur',
    description: 'Description de l établissement',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'saintjean.cm',
    description: 'Domaine Google Workspace associé',
  })
  @IsOptional()
  @IsString()
  googleWorkspaceDomain?: string;

  @ApiPropertyOptional({
    example: 'fr',
    default: 'fr',
    description: 'Langue principale de l établissement',
  })
  @IsOptional()
  @IsString()
  mainLanguage?: string;
}
