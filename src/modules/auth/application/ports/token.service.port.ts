export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface TokenPayload {
  sub: string;
  email: string;
}

export interface TokenServicePort {
  sign(payload: TokenPayload): Promise<string>;
  verify(token: string): Promise<TokenPayload>;
}
