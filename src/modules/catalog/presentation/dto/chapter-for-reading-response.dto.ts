import { ApiProperty } from '@nestjs/swagger';

export class ChapterPageItemResponseDto {
  @ApiProperty({ example: 1 })
  pageNumber!: number;

  @ApiProperty({ example: 'https://cdn.example/page-1.jpg' })
  imageUrl!: string;
}

/** Resposta de GET /chapters/:id (Fase C — sem cota; Fase D adiciona regras de acesso). */
export class ChapterForReadingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  mangaId!: string;

  @ApiProperty({ example: '12' })
  number!: string;

  @ApiProperty({ nullable: true, type: String })
  title!: string | null;

  @ApiProperty({ enum: ['public', 'coin'] })
  accessLevel!: string;

  @ApiProperty()
  coinCost!: number;

  @ApiProperty()
  views!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty()
  mangaSlug!: string;

  @ApiProperty()
  mangaTitle!: string;

  @ApiProperty({ type: [ChapterPageItemResponseDto] })
  pages!: ChapterPageItemResponseDto[];

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'ID do capítulo anterior (mesmo mangá, ordenação por number)',
  })
  prevChapterId!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'ID do capítulo seguinte',
  })
  nextChapterId!: string | null;
}
