import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddMangaToListDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  mangaId!: string;
}
