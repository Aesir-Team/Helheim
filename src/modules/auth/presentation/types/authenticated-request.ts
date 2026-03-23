import type { Request } from 'express';
import type { UserRole } from '../../domain/entities/user.entity';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: UserRole;
  };
}
