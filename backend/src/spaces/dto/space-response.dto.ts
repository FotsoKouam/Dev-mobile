import { ApiProperty } from '@nestjs/swagger';
import { SpaceStatus, SpaceType } from '../space.enums.js';

export class SpaceSchoolSummaryDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Institut Universitaire Saint Jean' })
  name: string;
}

export class SpaceProgramSummaryDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'ISI' })
  name: string;
}

export class SpaceResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Graphes et algorithmes' })
  name: string;

  @ApiProperty({ example: null, nullable: true })
  description: string | null;

  @ApiProperty({ enum: SpaceType, example: SpaceType.INSTITUTIONAL })
  type: SpaceType;

  @ApiProperty({ enum: SpaceStatus, example: SpaceStatus.ACTIVE })
  status: SpaceStatus;

  @ApiProperty({ type: SpaceSchoolSummaryDto })
  school: SpaceSchoolSummaryDto;

  @ApiProperty({ type: SpaceProgramSummaryDto })
  program: SpaceProgramSummaryDto;

  @ApiProperty({ example: '2026-10-21T09:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-21T09:30:00.000Z' })
  updatedAt: string;
}

