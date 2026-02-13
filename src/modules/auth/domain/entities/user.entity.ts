/**
 * Entidade User do domínio Auth (sem password na saída de perfil).
 */
export type UserRole = 'ADMIN' | 'MODERATOR' | 'VIP' | 'USER';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  coinsBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUserWithPassword extends AuthUser {
  password: string;
}
