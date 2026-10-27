import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateSchoolDto } from './create-school.dto.js';
import { SchoolStatus } from '../enums/school-status.enum.js';

export class UpdateSchoolDto extends PartialType(CreateSchoolDto) {
  @ApiPropertyOptional({
    enum: SchoolStatus,
    example: SchoolStatus.ACTIVE,
    description: 'Statut de l établissement (active ou inactive)',
  })
  @IsOptional()
  @IsEnum(SchoolStatus)
  status?: SchoolStatus;
}
