import { ApiProperty } from '@nestjs/swagger';
import { MangaSummaryResponseDto } from './manga-summary-response.dto';

export class HomeFeedResponseDto {
  @ApiProperty({
    type: [MangaSummaryResponseDto],
    description: 'Itens em alta vindos do trending externo + catálogo local.',
  })
  trending!: MangaSummaryResponseDto[];

  @ApiProperty({
    type: [MangaSummaryResponseDto],
    description:
      'Até `limit` itens do catálogo local (maior rating), **excluindo** slugs já em `trending` (sem duplicar). Se o primeiro lote coincidir muito com trending, a API **pagina** o catálogo até encher `limit` ou esgotar obras.',
  })
  recommended!: MangaSummaryResponseDto[];

  @ApiProperty({
    type: [MangaSummaryResponseDto],
    description: 'Últimas atualizações do catálogo local.',
  })
  latestUpdates!: MangaSummaryResponseDto[];
}
