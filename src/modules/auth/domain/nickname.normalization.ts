/** Nickname persistido e comparado de forma estável (trim + minúsculas). */
export function normalizeNickname(raw: string): string {
  return raw.trim().toLowerCase();
}
