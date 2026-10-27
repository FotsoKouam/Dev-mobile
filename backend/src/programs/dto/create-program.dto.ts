import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProgramDto {
  @ApiProperty({
    example: 'ISI',
    description: 'Nom de la filière (unique par école)',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Ingénierie des Systèmes d Information',
    description: 'Description de la filière',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
