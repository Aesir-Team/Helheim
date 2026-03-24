import { compareChapterNumberAsc } from './chapter-free-tier.policy';

/**
 * Quantos capítulos publicados contam como "lidos até ao marcador" (mesma regra que
 * `isChapterReadUpToBookmark` na listagem): `number` ≤ `bookmarkChapterNumber` em ordem natural.
 */
export function countPublishedChapterNumbersUpToBookmark(
  publishedNumbers: readonly string[],
  bookmarkChapterNumber: string,
): number {
  return publishedNumbers.filter(
    (n) => compareChapterNumberAsc(n, bookmarkChapterNumber) <= 0,
  ).length;
}
