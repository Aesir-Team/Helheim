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
    description: 'Itens recomendados do catálogo local (maior rating).',
  })
  recommended!: MangaSummaryResponseDto[];

  @ApiProperty({
    type: [MangaSummaryResponseDto],
    description: 'Últimas atualizações do catálogo local.',
  })
  latestUpdates!: MangaSummaryResponseDto[];
}
