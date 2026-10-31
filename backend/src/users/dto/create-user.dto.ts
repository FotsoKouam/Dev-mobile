import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuthMethod } from '../enums/auth-method.enum.js';
import { UserAssignmentDto } from './user-assignment.dto.js';

export class CreateUserDto {
  @ApiProperty({ example: 'jean.pierre@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Jean Pierre' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Mbarga' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: '+237 600 00 00 00' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ enum: AuthMethod, example: AuthMethod.GOOGLE })
  @IsEnum(AuthMethod)
  @IsNotEmpty()
  authMethod: AuthMethod;

  @ApiPropertyOptional({ type: UserAssignmentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserAssignmentDto)
  assignment?: UserAssignmentDto;
}
