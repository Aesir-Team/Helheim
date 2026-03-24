/**
 * Entidade User do domínio Auth (sem password na saída de perfil).
 */
export type UserRole = 'ADMIN' | 'MODERATOR' | 'VIP' | 'USER';

/** Métricas leves de leitura (GET /auth/me). */
export interface AuthUserReadingStats {
  /** Mangás com registro em `reading_progress`. */
  mangasWithProgressCount: number;
  /** Soma de `chaptersReadCount` por mangá (mesma métrica do progresso). */
  chaptersReadTotal: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  nickname: string;
  role: UserRole;
  coinsBalance: number;
  createdAt: Date;
  updatedAt: Date;
  /** Preenchido em GET /auth/me; omitido em login/registro. */
  reading?: AuthUserReadingStats;
}

export interface AuthUserWithPassword extends AuthUser {
  password: string;
}
