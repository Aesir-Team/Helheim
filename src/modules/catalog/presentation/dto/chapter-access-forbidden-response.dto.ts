import { ApiProperty } from '@nestjs/swagger';

export class ChapterAccessForbiddenResponseDto {
  @ApiProperty({ example: 403 })
  statusCode!: number;

  @ApiProperty({
    example: 'Este capítulo exige desbloqueio com coins. Desbloqueie antes de ler.',
  })
  message!: string;

  @ApiProperty({
    description:
      'Motivo estável para o cliente (ex.: capítulo coin sem desbloqueio ou login obrigatório).',
    example: 'coin_chapter_not_unlocked',
    enum: ['coin_chapter_not_unlocked', 'authentication_required'],
  })
  reason!: string;
}
