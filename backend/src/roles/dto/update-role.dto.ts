import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { RoleStatus } from '../enums/role-status.enum.js';
import { ALL_PERMISSION_CODES } from '../permissions.constant.js';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    example: 'Responsable pédagogique',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: RoleStatus })
  @IsOptional()
  @IsEnum(RoleStatus)
  status?: RoleStatus;

  @ApiPropertyOptional({
    example: ['add_document'],
    description: `Codes des permissions. Valeurs possibles : ${ALL_PERMISSION_CODES.join(', ')}`,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions?: string[];
}
