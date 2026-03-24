/**
 * Denominador estável para UI (barra de leitura, %): não encolhe durante sync incremental.
 * `reported` vem da API externa (lista de capítulos no GET manga) ou do fim do sync.
 */
export function resolveMangaChaptersDisplayCount(
  publishedInDb: number,
  reportedFromSource: number | null,
): number {
  return Math.max(publishedInDb, reportedFromSource ?? 0);
}
