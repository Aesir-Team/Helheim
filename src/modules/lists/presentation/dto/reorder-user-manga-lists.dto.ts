import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReorderUserMangaListsDto {
  @ApiProperty({
    description:
      'IDs das listas na ordem desejada (deve conter exatamente todas as listas do usuário, sem duplicar).',
    type: [String],
    example: ['uuid-a', 'uuid-b'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  listIds!: string[];
}
