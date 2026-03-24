import type { Request } from 'express';
import type { UserRole } from '../../domain/entities/user.entity';

/** Request após `OptionalJwtAuthGuard`: `user` só existe com Bearer válido. */
export interface OptionalAuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}
