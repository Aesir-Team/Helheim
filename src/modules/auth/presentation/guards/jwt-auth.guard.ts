import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      throw new UnauthorizedException('Token não informado');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
      }>(token);
      (request as Request & { user: { userId: string; email: string } }).user =
        {
          userId: payload.sub,
          email: payload.email,
        };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
