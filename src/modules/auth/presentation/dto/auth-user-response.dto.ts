import { ApiProperty } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({ example: 'clxx...' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'João' })
  firstName!: string;

  @ApiProperty({ example: 'Silva' })
  lastName!: string;

  @ApiProperty({ enum: ['ADMIN', 'MODERATOR', 'VIP', 'USER'] })
  role!: string;

  @ApiProperty({ example: 0, description: 'Saldo de coins do usuário' })
  coinsBalance!: number;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt!: string;
}
