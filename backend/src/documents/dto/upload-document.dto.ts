import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadDocumentDto {
  @ApiPropertyOptional({
    description: 'Nom du document (utilise le nom d origine si omis)',
    example: 'Cours_Graphes_Ch3.pdf',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
