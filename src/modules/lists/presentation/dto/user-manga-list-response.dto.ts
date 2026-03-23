import { ApiProperty } from '@nestjs/swagger';

export class UserMangaListItemResponseDto {
  @ApiProperty()
  itemId!: string;

  @ApiProperty()
  mangaId!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  addedAt!: Date;

  @ApiProperty()
  mangaTitle!: string;

  @ApiProperty()
  mangaSlug!: string;

  @ApiProperty()
  mangaCoverImage!: string;
}

export class UserMangaListSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({
    description:
      'Quantos mangás da lista já têm progresso de leitura (schema; Fase F pode atualizar).',
  })
  mangasReadCount!: number;

  @ApiProperty({ description: 'Itens na lista (mangás não soft-deleted)' })
  itemCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class UserMangaListDetailResponseDto extends UserMangaListSummaryResponseDto {
  @ApiProperty({ type: [UserMangaListItemResponseDto] })
  items!: UserMangaListItemResponseDto[];
}
