import { ApiProperty } from '@nestjs/swagger';
import { SchoolType } from '../enums/school-type.enum.js';
import { SchoolStatus } from '../enums/school-status.enum.js';

export class SchoolResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Institut Universitaire Saint Jean' })
  name: string;

  @ApiProperty({ enum: SchoolType, example: SchoolType.PRIVATE })
  type: SchoolType;

  @ApiProperty({ example: 'Yaoundé' })
  city: string;

  @ApiProperty({ example: null, nullable: true })
  address: string | null;

  @ApiProperty({ example: null, nullable: true })
  phone: string | null;

  @ApiProperty({ example: null, nullable: true })
  description: string | null;

  @ApiProperty({ example: null, nullable: true })
  googleWorkspaceDomain: string | null;

  @ApiProperty({ example: 'fr' })
  mainLanguage: string;

  @ApiProperty({ enum: SchoolStatus, example: SchoolStatus.ACTIVE })
  status: SchoolStatus;

  @ApiProperty({ example: 3, description: 'Nombre de filières associées' })
  programsCount: number;

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
