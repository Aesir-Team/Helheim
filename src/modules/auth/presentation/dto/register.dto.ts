import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'João', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Silva', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({
    example: 'leitor_manga',
    minLength: 2,
    maxLength: 100,
    description:
      'Apelido único (trim + minúsculas na persistência; comparado sem diferenciar maiúsculas).',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nickname!: string;
}
