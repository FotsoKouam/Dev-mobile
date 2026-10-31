import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleCode } from '../enums/role-code.enum.js';
import { RoleStatus } from '../enums/role-status.enum.js';

export class RoleResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ enum: RoleCode, example: RoleCode.STAFF })
  code: RoleCode;

  @ApiProperty({ example: 'Personnel' })
  name: string;

  @ApiPropertyOptional({
    example: 'Ajout de documents aux espaces institutionnels de sa filière',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ example: true, description: 'true pour les 5 rôles système, false pour les rôles personnalisés' })
  isSystem: boolean;

  @ApiProperty({ enum: RoleStatus, example: RoleStatus.ACTIVE })
  status: RoleStatus;

  @ApiProperty({
    example: ['add_document', 'replace_or_delete_document'],
    description: 'Codes des permissions attribuées à ce rôle',
    type: [String],
  })
  permissions: string[];

  @ApiProperty({ example: 24, description: 'Nombre d\'utilisateurs ayant ce rôle via une affectation active' })
  usersCount: number;

  @ApiProperty({ example: '2026-10-28T09:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-28T09:00:00.000Z' })
  updatedAt: string;
}
