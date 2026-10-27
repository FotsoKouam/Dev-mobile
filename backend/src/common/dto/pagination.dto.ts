import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Page courante' })
  page: number;

  @ApiProperty({ example: 10, description: 'Nombre d éléments par page' })
  limit: number;

  @ApiProperty({ example: 42, description: 'Nombre total d éléments' })
  total: number;
}

export class PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMetaDto;
}
