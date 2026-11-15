import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogUserDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Admin' })
  firstName: string;

  @ApiProperty({ example: 'Fatso' })
  lastName: string;

  @ApiPropertyOptional({ example: 'platform_admin' })
  role?: string | null;
}

export class AuditLogDetailsDto {
  @ApiPropertyOptional({ example: 'user@campusia.cm', nullable: true })
  emailAttempted?: string | null;

  @ApiPropertyOptional({ example: 'Invalid credentials', nullable: true })
  failureReason?: string | null;

  @ApiPropertyOptional({ example: 'Chrome 142 / Windows 11', nullable: true })
  userAgent?: string | null;
}

export class AuditLogResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '2026-11-03T22:41:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: 'login_success' })
  action: string;

  @ApiProperty({ example: 'success' })
  result: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  target?: string | null;

  @ApiPropertyOptional({ type: AuditLogUserDto, nullable: true })
  user?: AuditLogUserDto | null;

  @ApiPropertyOptional({ example: '192.0.2.14', nullable: true })
  ipAddress?: string | null;

  @ApiProperty({ type: AuditLogDetailsDto })
  details: AuditLogDetailsDto;
}
