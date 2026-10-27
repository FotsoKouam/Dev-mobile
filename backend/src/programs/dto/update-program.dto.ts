import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateProgramDto } from './create-program.dto.js';
import { ProgramStatus } from '../enums/program-status.enum.js';

export class UpdateProgramDto extends PartialType(CreateProgramDto) {
  @ApiPropertyOptional({
    enum: ProgramStatus,
    example: ProgramStatus.ACTIVE,
    description: 'Statut de la filière (active ou inactive)',
  })
  @IsOptional()
  @IsEnum(ProgramStatus)
  status?: ProgramStatus;
}
