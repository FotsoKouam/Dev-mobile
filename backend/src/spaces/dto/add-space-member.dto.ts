import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddSpaceMemberDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Identifiant de l\'utilisateur à ajouter comme membre de l\'espace',
  })
  @IsNotEmpty()
  @IsUUID('all')
  userId: string;
}
