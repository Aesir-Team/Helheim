import { ApiProperty } from '@nestjs/swagger';

/**
 * Formato padrão de erro da API (ValidationPipe e exceções HTTP).
 */
export class ErrorResponseDto {
  @ApiProperty({
    example: 400,
    description: 'Código HTTP de status',
  })
  statusCode!: number;

  @ApiProperty({
    example: 'Email já cadastrado',
    description: 'Mensagem de erro',
  })
  message!: string | string[];

  @ApiProperty({
    example: 'Conflict',
    description: 'Nome do erro (opcional, em exceções padrão NestJS)',
    required: false,
  })
  error?: string;
}
