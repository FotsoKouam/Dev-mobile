import { ApiProperty } from '@nestjs/swagger';

export class UsersCountDto {
  @ApiProperty({ example: 0 })
  active: number;

  @ApiProperty({ example: 0 })
  total: number;
}

export class ByRoleCountDto {
  @ApiProperty({ example: 0 })
  platform_admin: number;

  @ApiProperty({ example: 0 })
  school_admin: number;

  @ApiProperty({ example: 0 })
  staff: number;

  @ApiProperty({ example: 0 })
  student: number;

  @ApiProperty({ example: 0 })
  guest: number;
}

export class UserStatsResponseDto {
  @ApiProperty({ type: UsersCountDto })
  users: UsersCountDto;

  @ApiProperty({ type: ByRoleCountDto })
  byRole: ByRoleCountDto;
}
