import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  TokenPayload,
  TokenServicePort,
} from '../application/ports/token.service.port';

@Injectable()
export class JwtTokenService implements TokenServicePort {
  constructor(private readonly jwtService: JwtService) {}

  async sign(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  async verify(token: string): Promise<TokenPayload> {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      email: string;
    }>(token);
    return { sub: payload.sub, email: payload.email };
  }
}
