export const HASH_SERVICE = Symbol('HASH_SERVICE');

export interface HashServicePort {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
