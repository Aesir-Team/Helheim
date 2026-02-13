import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional } from 'class-validator';

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
}
