import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';
import { HASH_SERVICE } from '../ports/hash.service.port';
import type { HashServicePort } from '../ports/hash.service.port';
import { TOKEN_SERVICE } from '../ports/token.service.port';
import type { TokenServicePort } from '../ports/token.service.port';
import { UnauthorizedError } from '../../../../shared/domain/errors';
import { AuthUser } from '../../domain/entities/user.entity';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  user: AuthUser;
  token: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepositoryPort,
    @Inject(HASH_SERVICE) private readonly hashService: HashServicePort,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenServicePort,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Credenciais inválidas');
    }
    const valid = await this.hashService.compare(input.password, user.password);
    if (!valid) {
      throw new UnauthorizedError('Credenciais inválidas');
    }
    const token = await this.tokenService.sign({
      sub: user.id,
      email: user.email,
    });
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      coinsBalance: user.coinsBalance,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    return { user: authUser, token };
  }
}
