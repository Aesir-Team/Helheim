import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';
import { HASH_SERVICE } from '../ports/hash.service.port';
import type { HashServicePort } from '../ports/hash.service.port';
import { TOKEN_SERVICE } from '../ports/token.service.port';
import type { TokenServicePort } from '../ports/token.service.port';
import { ConflictError } from '../../../../shared/domain/errors';
import { AuthUser } from '../../domain/entities/user.entity';

export interface RegisterUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterUserOutput {
  user: AuthUser;
  token: string;
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepositoryPort,
    @Inject(HASH_SERVICE) private readonly hashService: HashServicePort,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenServicePort,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) throw new ConflictError('Email já cadastrado');
    const passwordHash = await this.hashService.hash(input.password);
    const user = await this.userRepo.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });
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
