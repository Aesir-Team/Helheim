import { Module } from '@nestjs/common';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { LoginUseCase } from './use-cases/login.use-case';
import { GetProfileUseCase } from './use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from './use-cases/update-profile.use-case';
import { USER_REPOSITORY } from './ports/user.repository.port';
import { HASH_SERVICE } from './ports/hash.service.port';
import { TOKEN_SERVICE } from './ports/token.service.port';
import { PrismaUserRepository } from '../infrastructure/persistence/prisma-user.repository';
import { JwtTokenService } from '../infrastructure/jwt-token.service';
import { BcryptHashService } from '../infrastructure/bcrypt-hash.service';
import { PrismaModule } from '../../../shared/infrastructure/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'change-me-in-production'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    RegisterUserUseCase,
    LoginUseCase,
    GetProfileUseCase,
    UpdateProfileUseCase,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: HASH_SERVICE, useClass: BcryptHashService },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
  ],
  exports: [
    JwtModule,
    RegisterUserUseCase,
    LoginUseCase,
    GetProfileUseCase,
    UpdateProfileUseCase,
    TOKEN_SERVICE,
  ],
})
export class AuthApplicationModule {}
