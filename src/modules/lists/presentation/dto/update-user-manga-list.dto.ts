import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserMangaListDto {
  @ApiPropertyOptional({ example: 'Favoritos', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Ordem manual da lista entre as demais',
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
