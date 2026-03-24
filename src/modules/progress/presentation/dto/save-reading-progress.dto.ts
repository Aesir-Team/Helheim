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
    deprecated: true,
    description:
      'Ignorado pelo servidor. O total de lidos é calculado a partir do `chapterId` (marcador): conta capítulos publicados com `number` ≤ ao desse capítulo, igual à regra de `isRead` na listagem.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  chaptersReadCount?: number;
}
