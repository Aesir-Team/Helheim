import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class SaveReadingProgressDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  mangaId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  chapterId!: string;

  @ApiPropertyOptional({ minimum: 1, example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageNumber?: number;

  @ApiPropertyOptional({
    minimum: 0,
    description:
      'Total de capítulos lidos neste mangá. Se omitido, mantém ao mesmo capítulo ou incrementa ao mudar de capítulo.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  chaptersReadCount?: number;
}
