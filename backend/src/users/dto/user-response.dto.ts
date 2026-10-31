import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleCode } from '../../roles/enums/role-code.enum.js';
import { AssignmentStatus } from '../../assignments/enums/assignment-status.enum.js';
import { AuthMethod } from '../enums/auth-method.enum.js';
import { UserStatus } from '../enums/user-status.enum.js';

export class AssignmentRoleDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ enum: RoleCode, example: RoleCode.SCHOOL_ADMIN })
  code: RoleCode;

  @ApiProperty({ example: 'Administrateur école' })
  name: string;
}

export class AssignmentSchoolDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Institut Universitaire Saint Jean' })
  name: string;
}

export class AssignmentProgramDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'ISI' })
  name: string;
}

export class UserAssignmentItemResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ type: AssignmentRoleDto })
  role: AssignmentRoleDto;

  @ApiPropertyOptional({ type: AssignmentSchoolDto, nullable: true })
  school: AssignmentSchoolDto | null;

  @ApiPropertyOptional({ type: AssignmentProgramDto, nullable: true })
  program: AssignmentProgramDto | null;

  @ApiProperty({ enum: AssignmentStatus, example: AssignmentStatus.ACTIVE })
  status: AssignmentStatus;
}

export class UserResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'jean.pierre@example.com' })
  email: string;

  @ApiProperty({ example: 'Jean Pierre' })
  firstName: string;

  @ApiProperty({ example: 'Mbarga' })
  lastName: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  phone: string | null;

  @ApiProperty({ enum: AuthMethod, example: AuthMethod.GOOGLE })
  authMethod: AuthMethod;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  @ApiPropertyOptional({ example: null, nullable: true })
  lastLoginAt: string | null;

  @ApiProperty({ type: [UserAssignmentItemResponseDto] })
  assignments: UserAssignmentItemResponseDto[];

  @ApiProperty({ example: '2026-10-28T09:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-28T09:00:00.000Z' })
  updatedAt: string;
}
