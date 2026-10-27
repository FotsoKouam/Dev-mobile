import { ApiProperty } from '@nestjs/swagger';

export class CountMetricDto {
  @ApiProperty({ example: 4 })
  active: number;

  @ApiProperty({ example: 5 })
  total: number;
}

export class SchoolStatsResponseDto {
  @ApiProperty({ type: CountMetricDto })
  schools: CountMetricDto;

  @ApiProperty({ type: CountMetricDto })
  programs: CountMetricDto;

  // TODO: calculate from users module when implemented
  @ApiProperty({ type: CountMetricDto })
  users: CountMetricDto;

  // TODO: calculate from spaces module when implemented
  @ApiProperty({ type: CountMetricDto })
  institutionalSpaces: CountMetricDto;
}
