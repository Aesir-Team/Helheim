import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  CreateUserInput,
  UpdateUserProfileInput,
  UserRepositoryPort,
} from '../../application/ports/user.repository.port';
import { AuthUserWithPassword } from '../../domain/entities/user.entity';
import { Role } from '@prisma/client';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<AuthUserWithPassword | null> {
    const row = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<AuthUserWithPassword | null> {
    const row = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async create(data: CreateUserInput): Promise<AuthUserWithPassword> {
    const row = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: Role.USER,
      },
    });
    return this.toDomain(row);
  }

  async updateProfile(
    userId: string,
    data: UpdateUserProfileInput,
  ): Promise<AuthUserWithPassword> {
    const row = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName != null && { firstName: data.firstName }),
        ...(data.lastName != null && { lastName: data.lastName }),
      },
    });
    return this.toDomain(row);
  }

  private toDomain(row: {
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Role;
    coinsBalance: number;
    createdAt: Date;
    updatedAt: Date;
  }): AuthUserWithPassword {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role as AuthUserWithPassword['role'],
      coinsBalance: row.coinsBalance,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
