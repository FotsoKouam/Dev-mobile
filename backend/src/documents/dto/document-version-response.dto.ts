import { ApiProperty } from '@nestjs/swagger';

export class DocumentVersionResponseDto {
  @ApiProperty({ example: 1 })
  versionNumber: number;

  @ApiProperty({ example: 'Cours_Graphes_Ch3.pdf' })
  originalFilename: string;

  @ApiProperty({ example: 2516582 })
  sizeBytes: number;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({
    example: { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Essiane Paul' },
  })
  uploadedBy: {
    id: string;
    name: string;
  };

  @ApiProperty({ example: '2026-09-12T08:32:00.000Z' })
  createdAt: string;
}
