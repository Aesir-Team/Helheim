/**
 * Política MVP: fração inicial dos capítulos (por ordem de `number`) fica `public`;
 * o restante `coin`. Ordenação estável para números como string ("1", "2", "10").
 */

export function compareChapterNumberAsc(a: string, b: string): number {
  const ka = chapterNumberSortKey(a);
  const kb = chapterNumberSortKey(b);
  if (Number.isFinite(ka) && Number.isFinite(kb) && ka !== kb) {
    return ka - kb;
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function chapterNumberSortKey(n: string): number {
  const t = n.trim();
  const m = t.match(/^-?\d+(\.\d+)?/);
  if (m) {
    const v = parseFloat(m[0]);
    return Number.isFinite(v) ? v : Number.NaN;
  }
  const v = parseFloat(t.replace(',', '.'));
  return Number.isFinite(v) ? v : Number.NaN;
}

/** Quantos capítulos ficam públicos: ceil(total * fraction), limitado a [0, total]. */
export function freePublicChapterCount(
  total: number,
  freeFraction: number,
): number {
  if (total <= 0) {
    return 0;
  }
  const f =
    Number.isFinite(freeFraction) && freeFraction > 0
      ? Math.min(freeFraction, 1)
      : 0.1;
  const k = Math.ceil(total * f);
  return Math.min(total, Math.max(0, k));
}

export function parseFreeChapterFraction(
  raw: string | number | undefined | null,
): number {
  if (raw === undefined || raw === null || raw === '') {
    return 0.1;
  }
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) {
    return 0.1;
  }
  return n > 1 ? 1 : n;
}

export function parseCoinChapterCost(
  raw: string | number | undefined | null,
): number {
  if (raw === undefined || raw === null || raw === '') {
    return 1;
  }
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}
