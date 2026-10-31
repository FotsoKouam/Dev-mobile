import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { RoleCode } from '../../roles/enums/role-code.enum.js';

export class UserAssignmentDto {
  @ApiPropertyOptional({ enum: RoleCode, example: RoleCode.STAFF })
  @IsEnum(RoleCode)
  @IsNotEmpty()
  roleCode: RoleCode;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID()
  programId?: string;
}
