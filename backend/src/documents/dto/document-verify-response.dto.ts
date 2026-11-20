import { ApiProperty } from '@nestjs/swagger';

export class DocumentVerifyResponseDto {
  @ApiProperty({ example: true })
  ok: boolean;
}
