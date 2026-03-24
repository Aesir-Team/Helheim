import { normalizeNickname } from './nickname.normalization';

describe('normalizeNickname', () => {
  it('should trim e converter para minúsculas', () => {
    expect(normalizeNickname('  JoGo  ')).toBe('jogo');
  });
});
