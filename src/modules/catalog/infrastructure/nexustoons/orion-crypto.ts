import { createHash } from 'crypto';

const CRYPTO_SECRET = 'OrionNexus2025CryptoKey!Secure';

interface KeyData {
  key: number[];
  rsbox: number[];
}

function deriveKeys(): KeyData[] {
  const result: KeyData[] = [];
  for (let i = 0; i < 5; i++) {
    const raw = `_orion_key_${i}_v2_${CRYPTO_SECRET}`;
    const hex = createHash('sha256').update(raw).digest('hex');
    const keyBytes = Array.from(Buffer.from(hex, 'hex'));

    const sbox = Array.from({ length: 256 }, (_, idx) => idx);
    let j = 0;
    for (let r = 0; r < 256; r++) {
      j = (j + sbox[r] + keyBytes[r % keyBytes.length]) % 256;
      [sbox[r], sbox[j]] = [sbox[j], sbox[r]];
    }
    const rsbox = new Array<number>(256);
    for (let r = 0; r < 256; r++) rsbox[sbox[r]] = r;

    result.push({ key: keyBytes, rsbox });
  }
  return result;
}

const KEYS = deriveKeys();

function rotateRight(val: number, n: number): number {
  n = n % 8;
  return ((val >>> n) | (val << (8 - n))) & 0xff;
}

function decrypt(keyIndex: number, b64: string): string {
  const cipher = Buffer.from(b64, 'base64');
  const kd = KEYS[keyIndex];
  const key = kd.key;
  const rsbox = kd.rsbox;
  const u = key.length;
  const result = Buffer.alloc(cipher.length);

  for (let d = cipher.length - 1; d >= 0; d--) {
    let h = cipher[d];
    h ^= d > 0 ? cipher[d - 1] : key[u - 1];
    h = rsbox[h];
    const f = (((key[(d + 3) % u] + (d & 255)) & 255) % 7) + 1;
    h = rotateRight(h, f);
    h ^= key[d % u];
    result[d] = h;
  }
  return result.toString('utf-8');
}

interface EncryptedPayload {
  d: string;
  k?: number;
  v?: number;
}

function isEncrypted(raw: unknown): raw is EncryptedPayload {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  return typeof obj.d === 'string' && typeof obj.v === 'number';
}

/** Decifra payload OrionCrypto da Nexustoons. Retorna o JSON original se não for cifrado. */
export function decryptResponse(raw: unknown): unknown {
  if (!isEncrypted(raw)) return raw;
  const keyIdx = raw.v === 1 ? 0 : (raw.k ?? 0);
  const text = decrypt(keyIdx, raw.d);
  return JSON.parse(text) as unknown;
}
