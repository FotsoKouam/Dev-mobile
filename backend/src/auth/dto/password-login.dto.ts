import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class PasswordLoginDto {
  @ApiProperty({ example: 'jean.pierre.mbarga@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'mon-mot-de-passe-admin' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

