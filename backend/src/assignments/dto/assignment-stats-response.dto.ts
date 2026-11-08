import { ApiProperty } from '@nestjs/swagger';

export class AssignmentStatsResponseDto {
  @ApiProperty({ example: 42, description: 'Nombre total des affectations' })
  total: number;

  @ApiProperty({ example: 25, description: 'Nombre distinct d\'utilisateurs concernés' })
  users: number;

  @ApiProperty({ example: 5, description: 'Nombre distinct d\'écoles impliquées' })
  schools: number;

  @ApiProperty({ example: 12, description: 'Nombre distinct de filières gérées' })
  programs: number;
}

