import { ApiProperty } from '@nestjs/swagger';

class CategoryRefDto {
  @ApiProperty({ example: 'cat-uuid' })
  id!: string;

  @ApiProperty({ example: 'Action' })
  name!: string;

  @ApiProperty({ example: 'action' })
  slug!: string;
}

export class MangaSummaryResponseDto {
  @ApiProperty({ example: 'manga-uuid' })
  id!: string;

  @ApiProperty({ example: 'Solo Leveling' })
  title!: string;

  @ApiProperty({ example: 'solo-leveling' })
  slug!: string;

  @ApiProperty({ example: 'https://img.test/cover.jpg' })
  coverImage!: string;

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

  @ApiProperty({ example: '2026-01-15T00:00:00.000Z', nullable: true })
  lastChapterAt!: Date | null;

  @ApiProperty({ type: [CategoryRefDto] })
  categories!: CategoryRefDto[];
}

export class PaginatedMangasResponseDto {
  @ApiProperty({ type: [MangaSummaryResponseDto] })
  data!: MangaSummaryResponseDto[];

  @ApiProperty({ example: 120 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 6 })
  totalPages!: number;
}
