import { ApiProperty } from '@nestjs/swagger';
import { AuthUserResponseDto } from './auth-user-response.dto';

/**
 * Resposta de login e registro: usuário autenticado + JWT.
 */
export class AuthTokenResponseDto {
  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT para usar no header Authorization: Bearer <token>',
  })
  token!: string;
}
