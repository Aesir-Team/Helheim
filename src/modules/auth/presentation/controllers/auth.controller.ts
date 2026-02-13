import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { GetProfileUseCase } from '../../application/use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import {
  ConflictError,
  UnauthorizedError,
} from '../../../../shared/domain/errors';

interface AuthenticatedRequest {
  user: { userId: string; email: string };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly login: LoginUseCase,
    private readonly getProfile: GetProfileUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.registerUser.execute({
        email: dto.email,
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });
    } catch (e) {
      if (e instanceof ConflictError) {
        throw new ConflictException((e as Error).message);
      }
      throw e;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async loginRoute(@Body() dto: LoginDto) {
    try {
      return await this.login.execute({
        email: dto.email,
        password: dto.password,
      });
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        throw new UnauthorizedException((e as Error).message);
      }
      throw e;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: AuthenticatedRequest) {
    return this.getProfile.execute(req.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.updateProfile.execute(req.user.userId, {
      ...(dto.firstName != null && { firstName: dto.firstName }),
      ...(dto.lastName != null && { lastName: dto.lastName }),
    });
  }
}
