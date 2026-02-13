import type { AuthUserWithPassword } from '../../domain/entities/user.entity';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export interface UpdateUserProfileInput {
  firstName?: string;
  lastName?: string;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepositoryPort {
  findByEmail(email: string): Promise<AuthUserWithPassword | null>;
  findById(id: string): Promise<AuthUserWithPassword | null>;
  create(data: CreateUserInput): Promise<AuthUserWithPassword>;
  updateProfile(
    userId: string,
    data: UpdateUserProfileInput,
  ): Promise<AuthUserWithPassword>;
}
