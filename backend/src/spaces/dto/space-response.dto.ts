import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpaceScope, SpaceStatus } from '../space.enums.js';

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

  @ApiProperty({ enum: SpaceScope, example: SpaceScope.PROGRAM })
  scope: SpaceScope;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', nullable: true })
  scopeProgramId?: string | null;

  @ApiPropertyOptional({ type: SpaceProgramSummaryDto, nullable: true })
  scopeProgram?: SpaceProgramSummaryDto | null;

  @ApiPropertyOptional({ example: 'staff', nullable: true })
  scopeRoleCode?: string | null;

  @ApiProperty({ enum: SpaceStatus, example: SpaceStatus.ACTIVE })
  status: SpaceStatus;

  @ApiProperty({ type: SpaceSchoolSummaryDto })
  school: SpaceSchoolSummaryDto;

  @ApiProperty({ example: '2026-10-21T09:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-21T09:30:00.000Z' })
  updatedAt: string;
}

export class SpaceMemberUserSummaryDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'jean.dupont@saintjean.cm' })
  email: string;

  @ApiProperty({ example: 'Jean' })
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  lastName: string;
}

export class SpaceMemberResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  spaceId: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  userId: string;

  @ApiProperty({ type: SpaceMemberUserSummaryDto })
  user: SpaceMemberUserSummaryDto;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', nullable: true })
  createdById?: string | null;

  @ApiProperty({ example: '2026-10-21T09:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-21T09:30:00.000Z' })
  updatedAt: string;
}
