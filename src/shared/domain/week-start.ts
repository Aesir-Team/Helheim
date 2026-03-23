/**
 * Início da semana ISO para cotas: segunda-feira 00:00:00.000 UTC que contém `date`.
 * Alinhado a PRODUTO: weekStart nunca vem do cliente.
 */
export function getUtcWeekStartMonday(date: Date): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const dayOfMonth = date.getUTCDate();
  const d = new Date(Date.UTC(y, m, dayOfMonth, 0, 0, 0, 0));
  const weekday = d.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}
