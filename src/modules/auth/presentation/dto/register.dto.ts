import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;
}
