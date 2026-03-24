import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChapterSummaryResponseDto {
  @ApiProperty({ example: 'ch-uuid' })
  id!: string;

  @ApiProperty({ example: 'manga-uuid' })
  mangaId!: string;

  @ApiProperty({ example: '42' })
  number!: string;

  @ApiPropertyOptional({ example: 'The Awakening' })
  title!: string | null;

  @ApiProperty({ example: 'public', enum: ['public', 'coin'] })
  accessLevel!: string;

  @ApiProperty({
    example: false,
    description:
      'Se true, capítulo está bloqueado para leitura direta e exige unlock por coin.',
  })
  isLocked!: boolean;

  @ApiProperty({ example: 0 })
  coinCost!: number;

  @ApiProperty({ example: '2026-01-15T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({
    example: false,
    description:
      'Com JWT: capítulos com `number` ≤ ao capítulo do `reading_progress` neste mangá (ordem natural). Sem token, sempre false.',
  })
  isRead!: boolean;

  @ApiProperty({
    example: true,
    description:
      '`createdAt` dentro da janela recente (`CHAPTER_IS_NEW_MAX_AGE_DAYS`, default 14).',
  })
  isNew!: boolean;
}

export class PaginatedChaptersResponseDto {
  @ApiProperty({ type: [ChapterSummaryResponseDto] })
  data!: ChapterSummaryResponseDto[];

  @ApiProperty({ example: 180 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 50 })
  limit!: number;
}
