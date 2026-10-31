import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AssignmentStatus } from '../enums/assignment-status.enum.js';

export class UpdateAssignmentDto {
  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID()
  programId?: string;

  @ApiPropertyOptional({ enum: AssignmentStatus, example: AssignmentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;
}
