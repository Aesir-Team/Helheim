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

  @ApiProperty({
    description:
      'Capítulos com `number` ≤ ao marcador (`chapterId`), calculado no servidor (alinhado a `isRead` na listagem).',
  })
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
      'Denominador da barra (chaptersReadCount / chaptersCount): max(BD, reportado), como no detalhe do mangá.',
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

  @ApiProperty({
    description:
      'Numerador da barra: mesma regra do `GET /mangas/:slug` — contagem por ordem natural até ao capítulo marcador.',
  })
  chaptersReadCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  lastReadAt!: Date;
}
