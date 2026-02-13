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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { GetProfileUseCase } from '../../application/use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { AuthTokenResponseDto } from '../dto/auth-token-response.dto';
import { AuthUserResponseDto } from '../dto/auth-user-response.dto';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import {
  ConflictError,
  UnauthorizedError,
} from '../../../../shared/domain/errors';

interface AuthenticatedRequest {
  user: { userId: string; email: string };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly login: LoginUseCase,
    private readonly getProfile: GetProfileUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar usuário',
    description:
      'Cria uma nova conta. Retorna o perfil e um JWT para autenticação.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso',
    type: AuthTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos (validação)',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email já cadastrado',
    type: ErrorResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
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
  @ApiOperation({
    summary: 'Login',
    description: 'Autentica com email e senha. Retorna o perfil e um JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    type: AuthTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos (validação)',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas',
    type: ErrorResponseDto,
  })
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
  @ApiBearerAuth('Bearer')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Perfil do usuário',
    description: 'Retorna o perfil do usuário autenticado (requer JWT).',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil do usuário',
    type: AuthUserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Token ausente ou inválido',
    type: ErrorResponseDto,
  })
  async me(@Request() req: AuthenticatedRequest) {
    return this.getProfile.execute(req.user.userId);
  }

  @Patch('me')
  @ApiBearerAuth('Bearer')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Atualizar perfil',
    description:
      'Atualiza nome e sobrenome do usuário autenticado (requer JWT).',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil atualizado',
    type: AuthUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos (validação)',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Token ausente ou inválido',
    type: ErrorResponseDto,
  })
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
