import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserReadingStatsResponseDto {
  @ApiProperty({
    example: 5,
    description: 'Quantidade de mangás com progresso de leitura salvo.',
  })
  mangasWithProgressCount!: number;

  @ApiProperty({
    example: 42,
    description:
      'Soma de `chaptersReadCount` em todos os mangás (evolução ao abrir capítulos; ver PATCH reading-progress).',
  })
  chaptersReadTotal!: number;
}

export class AuthUserResponseDto {
  @ApiProperty({ example: 'clxx...' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'João' })
  firstName!: string;

  @ApiProperty({ example: 'Silva' })
  lastName!: string;

  @ApiProperty({
    example: 'leitor_manga',
    description: 'Apelido único (armazenado em minúsculas).',
  })
  nickname!: string;

  @ApiProperty({ enum: ['ADMIN', 'MODERATOR', 'VIP', 'USER'] })
  role!: string;

  @ApiProperty({ example: 0, description: 'Saldo de coins do usuário' })
  coinsBalance!: number;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({
    type: AuthUserReadingStatsResponseDto,
    description:
      'Presente em **GET /auth/me** (agregados leves). Omitido em login/registro.',
  })
  reading?: AuthUserReadingStatsResponseDto;
}
