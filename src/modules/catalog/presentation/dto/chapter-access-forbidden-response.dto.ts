import { ApiProperty } from '@nestjs/swagger';

export class ChapterAccessForbiddenResponseDto {
  @ApiProperty({ example: 403 })
  statusCode!: number;

  @ApiProperty({
    example: 'Limite de 5 capítulo(s) distinto(s) por semana atingido.',
  })
  message!: string;

  @ApiProperty({
    description:
      'Motivo estável para o cliente (ex.: limite semanal, capítulo por coins no MVP ou login obrigatório para coin).',
    example: 'weekly_chapter_limit_exceeded',
    enum: [
      'weekly_chapter_limit_exceeded',
      'coin_chapter_not_available',
      'authentication_required',
    ],
  })
  reason!: string;
}
