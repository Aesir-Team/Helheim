/** Alinhado ao enum Prisma `MangaType` (sem importar @prisma/client no shared). */
export type CanonicalMangaType = 'manga' | 'manhwa' | 'manhua';

/** Alinhado ao enum Prisma `MangaStatus`. */
export type CanonicalMangaStatus = 'ongoing' | 'completed' | 'cancelled';

/**
 * Nexustoons (e outras fontes) enviam tipos fora do enum (`doujinshi`, etc.).
 * Mapeia para valor canônico do domínio Midgard.
 */
export function normalizeMangaTypeFromExternal(
  raw: string | null | undefined,
): CanonicalMangaType {
  if (raw == null || raw.trim() === '') {
    return 'manhwa';
  }
  const k = raw.trim().toLowerCase();
  if (k === 'manga' || k === 'manhwa' || k === 'manhua') {
    return k;
  }
  if (
    k === 'doujinshi' ||
    k === 'one-shot' ||
    k === 'oneshot' ||
    k === 'novel' ||
    k === 'light novel'
  ) {
    return 'manga';
  }
  return 'manhwa';
}

/**
 * Status externos (ex.: hiatus) → status canônico.
 */
export function normalizeMangaStatusFromExternal(
  raw: string | null | undefined,
): CanonicalMangaStatus {
  if (raw == null || raw.trim() === '') {
    return 'ongoing';
  }
  const k = raw.trim().toLowerCase();
  const map: Record<string, CanonicalMangaStatus> = {
    ongoing: 'ongoing',
    completed: 'completed',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    hiatus: 'ongoing',
    dropped: 'cancelled',
    paused: 'ongoing',
    publishing: 'ongoing',
  };
  return map[k] ?? 'ongoing';
}
