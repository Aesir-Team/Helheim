import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'João', maxLength: 100, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiProperty({ example: 'Silva', maxLength: 100, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({
    example: 'novo_nick',
    minLength: 2,
    maxLength: 100,
    required: false,
    description:
      'Novo apelido (único; trim + minúsculas na persistência). Omitir para não alterar.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nickname?: string;
}
