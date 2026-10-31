import { ApiProperty } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'jean.pierre@example.com' })
  email: string;

  @ApiProperty({ example: 'Jean Pierre' })
  firstName: string;

  @ApiProperty({ example: 'Mbarga' })
  lastName: string;

  @ApiProperty({ example: 'active' })
  status: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user: AuthUserResponseDto;

  @ApiProperty({
    type: [String],
    example: ['manage_users', 'manage_schools'],
  })
  permissions: string[];
}

