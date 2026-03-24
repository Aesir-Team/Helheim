import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MangaSyncProgressStateResponseDto {
  @ApiProperty({ example: 'solo-leveling' })
  slug!: string;

  @ApiProperty({ example: 'manhwa', enum: ['manga', 'manhwa', 'manhua'] })
  mangaType!: string;

  @ApiProperty({ example: 'running', enum: ['running', 'completed', 'timeout', 'failed'] })
  status!: string;

  @ApiProperty({ example: '2026-03-23T12:00:00.000Z' })
  startedAt!: string;

  @ApiProperty({ example: '2026-03-23T15:00:00.000Z' })
  deadlineAt!: string;

  @ApiProperty({ example: 120 })
  totalChapters!: number;

  @ApiProperty({ example: 34 })
  chaptersProcessed!: number;

  @ApiPropertyOptional({ example: '34', nullable: true })
  lastChapterNumber!: string | null;

  @ApiProperty({ example: '2026-03-23T12:02:10.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ example: 'manga_sync_deadline_exceeded' })
  errorMessage?: string;
}

export class MangaSyncStatusResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indica se há estado recente de sincronização no backend.',
  })
  hasActiveState!: boolean;

  @ApiProperty({
    example: 28,
    description:
      'Percentual estimado de progresso (0-100), calculado por chaptersProcessed/totalChapters.',
  })
  progressPercent!: number;

  @ApiPropertyOptional({ type: MangaSyncProgressStateResponseDto, nullable: true })
  state!: MangaSyncProgressStateResponseDto | null;
}
