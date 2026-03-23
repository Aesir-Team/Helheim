import { getUtcWeekStartMonday } from './week-start';

describe('getUtcWeekStartMonday', () => {
  it('Given quarta 7 Jan 2026 UTC, should return segunda 5 Jan 2026 00:00 UTC', () => {
    const wed = new Date(Date.UTC(2026, 0, 7, 15, 30, 0));
    const mon = getUtcWeekStartMonday(wed);
    expect(mon.toISOString()).toBe('2026-01-05T00:00:00.000Z');
  });

  it('Given domingo 4 Jan 2026 UTC, should return segunda 29 Dez 2025 00:00 UTC', () => {
    const sun = new Date(Date.UTC(2026, 0, 4, 12, 0, 0));
    const mon = getUtcWeekStartMonday(sun);
    expect(mon.toISOString()).toBe('2025-12-29T00:00:00.000Z');
  });

  it('Given segunda 5 Jan 2026 00:00 UTC, should return o mesmo instante', () => {
    const mon = new Date(Date.UTC(2026, 0, 5, 0, 0, 0));
    const out = getUtcWeekStartMonday(mon);
    expect(out.toISOString()).toBe('2026-01-05T00:00:00.000Z');
  });
});
