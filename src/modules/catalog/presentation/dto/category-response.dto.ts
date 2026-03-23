import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ example: 'cat-uuid' })
  id!: string;

  @ApiProperty({ example: 'Action' })
  name!: string;

  @ApiProperty({ example: 'action' })
  slug!: string;

  @ApiProperty({ example: 'genre', enum: ['genre', 'theme'] })
  type!: string;

  @ApiProperty({ example: false })
  isNsfw!: boolean;
}
