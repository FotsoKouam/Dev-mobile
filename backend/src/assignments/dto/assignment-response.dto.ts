import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleCode } from '../../roles/enums/role-code.enum.js';
import { AssignmentStatus } from '../enums/assignment-status.enum.js';

export class AssignmentUserDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Jean Pierre' })
  firstName: string;

  @ApiProperty({ example: 'Mbarga' })
  lastName: string;

  @ApiProperty({ example: 'jean.pierre@example.com' })
  email: string;
}

export class AssignmentRoleDetailDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ enum: RoleCode, example: RoleCode.STAFF })
  code: RoleCode;

  @ApiProperty({ example: 'Personnel' })
  name: string;
}

export class AssignmentSchoolDetailDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Institut Universitaire Saint Jean' })
  name: string;
}

export class AssignmentProgramDetailDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'ISI' })
  name: string;
}

export class AssignmentResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ type: AssignmentUserDto })
  user: AssignmentUserDto;

  @ApiProperty({ type: AssignmentRoleDetailDto })
  role: AssignmentRoleDetailDto;

  @ApiPropertyOptional({ type: AssignmentSchoolDetailDto, nullable: true })
  school: AssignmentSchoolDetailDto | null;

  @ApiPropertyOptional({ type: AssignmentProgramDetailDto, nullable: true })
  program: AssignmentProgramDetailDto | null;

  @ApiProperty({ enum: AssignmentStatus, example: AssignmentStatus.ACTIVE })
  status: AssignmentStatus;

  @ApiProperty({ example: '2026-10-28T09:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-28T09:00:00.000Z' })
  updatedAt: string;
}
