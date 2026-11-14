import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentFileType, DocumentStatus } from '../document.enums.js';

export class DocumentSpaceDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Graphes et algorithmes' })
  name: string;
}

export class DocumentProgramDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'ISI' })
  name: string;
}

export class DocumentSchoolDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Institut Universitaire Saint Jean' })
  name: string;
}

export class DocumentUploadedByDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Essiane Paul' })
  name: string;
}

export class DocumentResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Cours_Graphes_Ch3.pdf' })
  name: string;

  @ApiProperty({ enum: DocumentFileType, example: DocumentFileType.PDF })
  fileType: DocumentFileType;

  @ApiProperty({ enum: DocumentStatus, example: DocumentStatus.PENDING })
  status: DocumentStatus;

  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({ type: DocumentSpaceDto })
  space: DocumentSpaceDto;

  @ApiPropertyOptional({ type: DocumentProgramDto })
  program?: DocumentProgramDto | null;

  @ApiPropertyOptional({ type: DocumentSchoolDto })
  school?: DocumentSchoolDto | null;

  @ApiProperty({ type: DocumentUploadedByDto })
  uploadedBy: DocumentUploadedByDto;

  @ApiProperty({ example: 2516582 })
  sizeBytes: number;

  @ApiProperty({ example: '2026-09-12T08:32:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-12T08:32:00.000Z' })
  updatedAt: string;
}
