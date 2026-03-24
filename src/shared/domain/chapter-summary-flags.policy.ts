import { compareChapterNumberAsc } from './chapter-free-tier.policy';

/**
 * Com um único `reading_progress` por (usuário, mangá), usamos o capítulo marcador
 * como “até onde o leitor chegou”: todo capítulo com `number` ≤ ao do marcador
 * (ordem natural) é tratado como lido na listagem.
 *
 * Limitação: se o usuário pular para um capítulo à frente sem ler os intermediários,
 * a API ainda marcará os anteriores como lidos — não há histórico por capítulo no BD.
 */
export function isChapterReadUpToBookmark(
  chapterNumber: string,
  bookmarkChapterNumber: string | null,
): boolean {
  if (bookmarkChapterNumber == null || bookmarkChapterNumber === '') {
    return false;
  }
  return compareChapterNumberAsc(chapterNumber, bookmarkChapterNumber) <= 0;
}

/** Capítulo “novo” na UI: `createdAt` dentro da janela recente (dias completos). */
export function isChapterNewByAge(
  createdAt: Date,
  now: Date,
  maxAgeDays: number,
): boolean {
  if (!Number.isFinite(maxAgeDays) || maxAgeDays <= 0) {
    return false;
  }
  const ms = maxAgeDays * 24 * 60 * 60 * 1000;
  return createdAt.getTime() >= now.getTime() - ms;
}
