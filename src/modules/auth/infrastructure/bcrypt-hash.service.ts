import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HashServicePort } from '../application/ports/hash.service.port';

@Injectable()
export class BcryptHashService implements HashServicePort {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
