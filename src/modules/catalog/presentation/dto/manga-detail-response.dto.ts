import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChapterSummaryResponseDto } from './chapter-summary-response.dto';

export class MangaDetailResponseDto {
  @ApiProperty({ example: 'manga-uuid' })
  id!: string;

  @ApiProperty({ example: 'Solo Leveling' })
  title!: string;

  @ApiProperty({ example: 'solo-leveling' })
  slug!: string;

  @ApiProperty({ example: 'https://img.test/cover.jpg' })
  coverImage!: string;

  @ApiPropertyOptional({ example: 'https://img.test/banner.jpg' })
  bannerImage!: string | null;

  @ApiProperty({ example: 'ongoing' })
  status!: string;

  @ApiProperty({ example: 'manhwa' })
  type!: string;

  @ApiProperty({ example: 4.8 })
  rating!: number;

  @ApiProperty({ example: 50000 })
  views!: number;

  @ApiProperty({ example: false })
  isNsfw!: boolean;

  @ApiPropertyOptional({ example: 'Na Sa-solo, o caçador mais fraco...' })
  description!: string | null;

  @ApiPropertyOptional({ example: 'Chugong' })
  author!: string | null;

  @ApiPropertyOptional({ example: 'Dubu' })
  artist!: string | null;

  @ApiPropertyOptional({ example: 'Na Sa-solo; I Level Up Alone' })
  alternativeTitles!: string | null;

  @ApiPropertyOptional({ example: 2020 })
  releaseYear!: number | null;

  @ApiPropertyOptional({ example: 'https://official.site' })
  officialLink!: string | null;

  @ApiProperty({ example: '2026-01-15T00:00:00.000Z', nullable: true })
  lastChapterAt!: Date | null;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
      },
    },
  })
  categories!: { id: string; name: string; slug: string }[];

  @ApiProperty({
    example: 180,
    description:
      'Denominador para UI (barra de lidos): max(capítulos publicados no BD, total reportado pela fonte no último GET/sync).',
  })
  chaptersCount!: number;

  @ApiProperty({
    example: 120,
    description:
      'Quantos capítulos publicados já estão persistidos no BD (durante sync pode ser menor que `chaptersCount`).',
  })
  chaptersSyncedCount!: number;

  @ApiPropertyOptional({
    nullable: true,
    example: 42,
    description:
      'Com JWT: quantos capítulos publicados têm `number` ≤ ao marcador (`reading_progress.chapterId`), alinhado a `isRead` na listagem (não é contagem de visitas). **0** sem progresso. Sem JWT: **null**.',
  })
  chaptersReadCount!: number | null;

  @ApiProperty({
    type: [ChapterSummaryResponseDto],
    description:
      'Últimos capítulos publicados (amostra). Com JWT, inclui `isLocked`, `isRead`, `isNew` como na listagem paginada.',
  })
  latestChapters!: ChapterSummaryResponseDto[];
}
