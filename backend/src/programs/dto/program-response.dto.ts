import { ApiProperty } from '@nestjs/swagger';
import { ProgramStatus } from '../enums/program-status.enum.js';

export class ProgramResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  schoolId: string;

  @ApiProperty({ example: 'ISI' })
  name: string;

  @ApiProperty({ example: null, nullable: true })
  description: string | null;

  @ApiProperty({ enum: ProgramStatus, example: ProgramStatus.ACTIVE })
  status: ProgramStatus;

  // TODO: calculate from users module when implemented
  @ApiProperty({ example: 0, description: 'Nombre d utilisateurs associés (0 tant que le module n existe pas)' })
  usersCount: number;

  // TODO: calculate from spaces module when implemented
  @ApiProperty({ example: 0, description: 'Nombre d espaces associés (0 tant que le module n existe pas)' })
  spacesCount: number;

  @ApiProperty({ example: '2026-10-21T09:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-21T09:30:00.000Z' })
  updatedAt: string;
}
