import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ChapterPreviewResponseDto {
  @ApiProperty({ example: 'ch-uuid' })
  id!: string;

  @ApiProperty({ example: '42' })
  number!: string;

  @ApiPropertyOptional({ example: 'The Awakening' })
  title!: string | null;

  @ApiProperty({ example: '2026-01-15T00:00:00.000Z' })
  createdAt!: Date;
}

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

  @ApiProperty({ example: 180 })
  chaptersCount!: number;

  @ApiProperty({ type: [ChapterPreviewResponseDto] })
  latestChapters!: ChapterPreviewResponseDto[];
}
