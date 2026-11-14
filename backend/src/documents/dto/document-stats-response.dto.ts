import { ApiProperty } from '@nestjs/swagger';

export class DocumentStatsResponseDto {
  @ApiProperty({ example: 10, description: 'Total des documents' })
  total: number;

  @ApiProperty({ example: 8, description: 'Documents disponibles' })
  available: number;

  @ApiProperty({
    example: 2,
    description: 'Documents en cours de traitement (pending, ocr, segmentation, indexing)',
  })
  processing: number;

  @ApiProperty({ example: 0, description: 'Documents en erreur' })
  error: number;
}
