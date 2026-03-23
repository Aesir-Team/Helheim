import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChapterSummaryResponseDto {
  @ApiProperty({ example: 'ch-uuid' })
  id!: string;

  @ApiProperty({ example: '42' })
  number!: string;

  @ApiPropertyOptional({ example: 'The Awakening' })
  title!: string | null;

  @ApiProperty({ example: 'public', enum: ['public', 'coin'] })
  accessLevel!: string;

  @ApiProperty({ example: 0 })
  coinCost!: number;

  @ApiProperty({ example: '2026-01-15T00:00:00.000Z' })
  createdAt!: Date;
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
