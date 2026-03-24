import { ApiProperty } from '@nestjs/swagger';

export class ReadingProgressSavedResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  mangaId!: string;

  @ApiProperty()
  chapterId!: string;

  @ApiProperty()
  pageNumber!: number;

  @ApiProperty()
  chaptersReadCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  lastReadAt!: Date;
}

export class ContinueReadingEntryResponseDto {
  @ApiProperty()
  progressId!: string;

  @ApiProperty()
  mangaId!: string;

  @ApiProperty()
  mangaTitle!: string;

  @ApiProperty()
  mangaSlug!: string;

  @ApiProperty()
  mangaCoverImage!: string;

  @ApiProperty({
    description:
      'Total de capítulos publicados no mangá (barra: chaptersReadCount / chaptersCount).',
  })
  chaptersCount!: number;

  @ApiProperty()
  chapterId!: string;

  @ApiProperty()
  chapterNumber!: string;

  @ApiProperty({ nullable: true })
  chapterTitle!: string | null;

  @ApiProperty()
  pageNumber!: number;

  @ApiProperty()
  chaptersReadCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  lastReadAt!: Date;
}
