import { ApiProperty } from '@nestjs/swagger';

export class AuditStatsResponseDto {
  @ApiProperty({ example: 0 })
  total: number;

  @ApiProperty({ example: 0 })
  loginSuccess: number;

  @ApiProperty({ example: 0 })
  loginFailure: number;

  @ApiProperty({ example: 0 })
  logout: number;
}
