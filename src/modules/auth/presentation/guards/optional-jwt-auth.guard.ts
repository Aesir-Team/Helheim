import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import type { UserRole } from '../../domain/entities/user.entity';

type RequestWithOptionalUser = Request & {
  user?: { userId: string; email: string; role: UserRole };
};

/**
 * Se não houver `Authorization: Bearer`, segue sem `user`.
 * Se houver token inválido/expirado → 401 (não ignora header malformado).
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithOptionalUser>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      request.user = undefined;
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        role?: UserRole;
      }>(token);
      request.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role ?? 'USER',
      };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
