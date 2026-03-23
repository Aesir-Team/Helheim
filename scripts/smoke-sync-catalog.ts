/**
 * Smoke test: API + Postgres + Nexustoons + (opcional) Redis no fluxo de sync.
 *
 * Pré-requisitos: API rodando (`npm run start:dev`), Postgres, rede para Nexustoons.
 * Opcional: REDIS_URL no ambiente da API e neste script para validar chaves de progresso.
 *
 * Fase 2 (cooldown): com REDIS_URL, após o 1º sync completo, dispara outro GET e verifica
 * se o estado no Redis mudou (novo sync) ou permaneceu (esperado: cooldown 24h).
 *
 * Uso:
 *   npx tsx scripts/smoke-sync-catalog.ts
 *   npx tsx scripts/smoke-sync-catalog.ts meu-slug
 *   SYNC_SMOKE_COOLDOWN_CHECK=0 npx tsx scripts/smoke-sync-catalog.ts  — pula fase 2
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const DEFAULT_BASE = 'http://localhost:3000';
const DEFAULT_SLUG = 'solo-leveling';
const DEFAULT_MAX_WAIT_MS = 120_000;
const POLL_INTERVAL_MS = 2_000;
const COOLDOWN_WATCH_MS = 25_000;
const COOLDOWN_POLL_MS = 1_000;

/** Preenche process.env a partir de `.env` na raiz (só chaves ainda indefinidas). */
function loadDotEnvOptional(): void {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) {
    return;
  }
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStringField(obj: unknown, key: string): string | null {
  if (!isRecord(obj)) {
    return null;
  }
  const v = obj[key];
  return typeof v === 'string' ? v : null;
}

function readNumberField(obj: unknown, key: string): number | null {
  if (!isRecord(obj)) {
    return null;
  }
  const v = obj[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

async function fetchJson(
  url: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(url);
  let body: unknown = null;
  const text = await res.text();
  if (text.length > 0) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }
  return { ok: res.ok, status: res.status, body };
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function envFlag(name: string, defaultTrue: boolean): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (v === undefined || v === '') {
    return defaultTrue;
  }
  return v === '1' || v === 'true' || v === 'yes';
}

async function tryRedisProgress(
  redisUrl: string,
  slug: string,
): Promise<{ key: string; state: Record<string, unknown> } | null> {
  const client = new Redis(redisUrl);
  try {
    const pattern = `midgard:manga-sync:v1:*:${slug}`;
    const keys = await client.keys(pattern);
    if (keys.length === 0) {
      return null;
    }
    const key = keys[0];
    const raw = await client.get(key);
    if (raw === null || raw === '') {
      return null;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
    if (!isRecord(parsed)) {
      return null;
    }
    return { key, state: parsed };
  } finally {
    await client.quit();
  }
}

function redisFingerprint(state: Record<string, unknown>): string {
  const u = readStringField(state, 'updatedAt') ?? '';
  const s = readStringField(state, 'startedAt') ?? '';
  const st = readStringField(state, 'status') ?? '';
  return `${st}|${s}|${u}`;
}

async function watchSecondSyncEffect(
  redisUrl: string,
  slug: string,
  baseline: string,
  watchMs: number,
): Promise<boolean> {
  const deadline = Date.now() + watchMs;
  while (Date.now() < deadline) {
    await new Promise((r) => {
      setTimeout(r, COOLDOWN_POLL_MS);
    });
    const progress = await tryRedisProgress(redisUrl, slug);
    if (progress === null) {
      continue;
    }
    const fp = redisFingerprint(progress.state);
    if (fp !== baseline) {
      return true;
    }
  }
  return false;
}

async function forceMangaStaleForSync(slug: string): Promise<boolean> {
  const prisma = new PrismaClient();
  try {
    const stale = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const res = await prisma.manga.updateMany({
      where: { slug },
      data: {
        syncStatus: 'idle',
        lastSyncedAt: stale,
        lastSyncError: null,
      },
    });
    return res.count > 0;
  } finally {
    await prisma.$disconnect();
  }
}

async function waitForCompletedStateAfterStartChange(
  redisUrl: string,
  slug: string,
  baselineStartedAt: string,
  waitMs: number,
): Promise<Record<string, unknown> | null> {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    const progress = await tryRedisProgress(redisUrl, slug);
    if (progress !== null) {
      const startedAt = readStringField(progress.state, 'startedAt') ?? '';
      const status = readStringField(progress.state, 'status') ?? '';
      if (startedAt !== baselineStartedAt && status === 'completed') {
        return progress.state;
      }
    }
    await new Promise((r) => {
      setTimeout(r, POLL_INTERVAL_MS);
    });
  }
  return null;
}

async function main(): Promise<void> {
  loadDotEnvOptional();

  const base = (process.env.SYNC_SMOKE_BASE_URL ?? DEFAULT_BASE).replace(
    /\/$/,
    '',
  );
  const slug = (process.argv[2] ?? DEFAULT_SLUG).trim();
  const maxWaitMs = parsePositiveInt(
    process.env.SYNC_SMOKE_MAX_WAIT_MS,
    DEFAULT_MAX_WAIT_MS,
  );
  const redisUrl = process.env.REDIS_URL?.trim() ?? '';
  const runCooldownCheck = envFlag('SYNC_SMOKE_COOLDOWN_CHECK', true);
  const runIncrementalCheck = envFlag('SYNC_SMOKE_INCREMENTAL_CHECK', true);
  const cooldownWatchMs = parsePositiveInt(
    process.env.SYNC_SMOKE_COOLDOWN_WATCH_MS,
    COOLDOWN_WATCH_MS,
  );

  if (!slug) {
    console.error('Slug vazio.');
    process.exitCode = 1;
    return;
  }

  const healthUrl = `${base}/api/v1/health`;
  const mangaUrl = `${base}/api/v1/mangas/${encodeURIComponent(slug)}`;
  const chaptersUrl = `${base}/api/v1/mangas/${encodeURIComponent(slug)}/chapters?limit=1&page=1`;

  console.log(`Base: ${base}`);
  console.log(`Slug: ${slug}`);
  console.log(`Timeout (fase 1): ${maxWaitMs}ms`);
  console.log(
    `Redis (este processo): ${redisUrl !== '' ? 'sim (REDIS_URL)' : 'não checado'}`,
  );
  console.log(
    `Teste 2º GET / cooldown: ${runCooldownCheck ? 'sim' : 'não (SYNC_SMOKE_COOLDOWN_CHECK)'}`,
  );
  console.log(
    `Teste incremental (force-resync): ${runIncrementalCheck ? 'sim' : 'não (SYNC_SMOKE_INCREMENTAL_CHECK)'}`,
  );
  console.log('');

  const health = await fetchJson(healthUrl);
  if (!health.ok) {
    console.error(`Health falhou (${health.status}): suba a API em ${base}`);
    process.exitCode = 1;
    return;
  }
  console.log('Health: OK');

  const mangaRes = await fetchJson(mangaUrl);
  if (!mangaRes.ok) {
    console.error(
      `GET mangas/:slug falhou (${mangaRes.status}). Corpo:`,
      JSON.stringify(mangaRes.body),
    );
    process.exitCode = 1;
    return;
  }
  const returnedSlug = readStringField(mangaRes.body, 'slug');
  if (returnedSlug !== slug) {
    console.warn(
      `Slug na resposta (${returnedSlug ?? '?'}) diferente do pedido (${slug}); seguindo mesmo assim.`,
    );
  }
  console.log(
    '1º GET mangas/:slug: OK (sync de capítulos agendado em background)',
  );

  const deadline = Date.now() + maxWaitMs;
  let lastTotal: number | null = null;
  let lastRedisStatus: string | null = null;

  while (Date.now() < deadline) {
    const ch = await fetchJson(chaptersUrl);
    let chaptersOk = false;
    if (ch.ok && isRecord(ch.body)) {
      lastTotal = readNumberField(ch.body, 'total');
      chaptersOk = lastTotal !== null && lastTotal > 0;
    }

    let redisCompleted = false;
    if (redisUrl !== '') {
      const progress = await tryRedisProgress(redisUrl, slug);
      if (progress !== null) {
        const st = readStringField(progress.state, 'status');
        lastRedisStatus = st;
        const processed = readNumberField(progress.state, 'chaptersProcessed');
        const totalCh = readNumberField(progress.state, 'totalChapters');
        console.log(
          `Redis [${progress.key}] status=${st ?? '?'} caps=${processed ?? '?'}/${totalCh ?? '?'}`,
        );
        redisCompleted = st === 'completed';
        if (st === 'failed') {
          const err = readStringField(progress.state, 'errorMessage');
          console.error(`Sync falhou (Redis): ${err ?? 'sem mensagem'}`);
          process.exitCode = 1;
          return;
        }
      }
    }

    const phase1Done =
      redisUrl === '' ? chaptersOk : chaptersOk && redisCompleted;

    if (phase1Done) {
      console.log('');
      if (redisUrl === '') {
        console.log(
          `Fase 1 OK: ${lastTotal ?? '?'} capítulo(s) no banco (sem Redis no script).`,
        );
      } else {
        console.log(
          `Fase 1 OK: ${lastTotal ?? '?'} capítulo(s) e Redis status=completed.`,
        );
      }

      if (!runCooldownCheck) {
        if (runIncrementalCheck && redisUrl !== '') {
          const snapshot = await tryRedisProgress(redisUrl, slug);
          if (snapshot !== null) {
            const baselineStartedAt =
              readStringField(snapshot.state, 'startedAt') ?? '';
            const touched = await forceMangaStaleForSync(slug);
            if (touched) {
              console.log('');
              console.log(
                'Fase 3: forçando manga como stale no banco para validar sync incremental…',
              );
              const third = await fetchJson(mangaUrl);
              if (!third.ok) {
                console.error(
                  `3º GET falhou (${third.status}): ${JSON.stringify(third.body)}`,
                );
                process.exitCode = 1;
                return;
              }
              const state = await waitForCompletedStateAfterStartChange(
                redisUrl,
                slug,
                baselineStartedAt,
                maxWaitMs,
              );
              if (state === null) {
                console.error(
                  'Fase 3 timeout: novo ciclo completed não apareceu no Redis.',
                );
                process.exitCode = 1;
                return;
              }
              const processed = readNumberField(state, 'chaptersProcessed');
              const total = readNumberField(state, 'totalChapters');
              console.log(
                `Fase 3 resultado: completed com chaptersProcessed=${processed ?? '?'} totalChapters=${total ?? '?'}`,
              );
              if (processed !== 0) {
                console.error(
                  'Incremental falhou: esperava 0 capítulos processados no re-sync sem novidades.',
                );
                process.exitCode = 1;
                return;
              }
              console.log(
                'Incremental OK: re-sync forçado não reprocessou capítulos existentes.',
              );
            }
          }
        }
        process.exitCode = 0;
        return;
      }

      if (redisUrl === '') {
        console.log('');
        console.log(
          'Fase 2 (2º GET / cooldown): omitida — defina REDIS_URL aqui e na API para comparar estado no Redis.',
        );
        process.exitCode = 0;
        return;
      }

      const snapshot = await tryRedisProgress(redisUrl, slug);
      if (snapshot === null) {
        console.log('');
        console.log(
          'Fase 2: não há chave de progresso no Redis — não dá para detectar 2º sync.',
        );
        process.exitCode = 0;
        return;
      }

      const baseline = redisFingerprint(snapshot.state);
      console.log('');
      console.log(
        `Snapshot Redis (pós-sync): fingerprint=${baseline.slice(0, 80)}…`,
      );
      console.log(
        '2º GET mangas/:slug (esperado com cooldown: sync ignorado)…',
      );

      const second = await fetchJson(mangaUrl);
      if (!second.ok) {
        console.error(
          `2º GET falhou (${second.status}): ${JSON.stringify(second.body)}`,
        );
        process.exitCode = 1;
        return;
      }

      const changed = await watchSecondSyncEffect(
        redisUrl,
        slug,
        baseline,
        cooldownWatchMs,
      );

      console.log('');
      if (changed) {
        console.log(
          `Resultado: estado Redis mudou em até ${cooldownWatchMs}ms → um novo sync provavelmente rodou (cooldown não aplicável ou BD sem lastSyncedAt recente).`,
        );
      } else {
        console.log(
          `Resultado: estado Redis estável por ${cooldownWatchMs}ms → 2º sync foi ignorado (consistente com cooldown de 24h após último sync completo).`,
        );
      }

      if (runIncrementalCheck) {
        const latestSnapshot = await tryRedisProgress(redisUrl, slug);
        if (latestSnapshot !== null) {
          const baselineStartedAt =
            readStringField(latestSnapshot.state, 'startedAt') ?? '';
          const touched = await forceMangaStaleForSync(slug);
          if (touched) {
            console.log('');
            console.log(
              'Fase 3: forçando manga como stale no banco para validar sync incremental…',
            );
            const third = await fetchJson(mangaUrl);
            if (!third.ok) {
              console.error(
                `3º GET falhou (${third.status}): ${JSON.stringify(third.body)}`,
              );
              process.exitCode = 1;
              return;
            }
            const state = await waitForCompletedStateAfterStartChange(
              redisUrl,
              slug,
              baselineStartedAt,
              maxWaitMs,
            );
            if (state === null) {
              console.error(
                'Fase 3 timeout: novo ciclo completed não apareceu no Redis.',
              );
              process.exitCode = 1;
              return;
            }
            const processed = readNumberField(state, 'chaptersProcessed');
            const total = readNumberField(state, 'totalChapters');
            console.log(
              `Fase 3 resultado: completed com chaptersProcessed=${processed ?? '?'} totalChapters=${total ?? '?'}`,
            );
            if (processed !== 0) {
              console.error(
                'Incremental falhou: esperava 0 capítulos processados no re-sync sem novidades.',
              );
              process.exitCode = 1;
              return;
            }
            console.log(
              'Incremental OK: re-sync forçado não reprocessou capítulos existentes.',
            );
          } else {
            console.log(
              'Fase 3: manga não encontrada para force-resync; teste incremental não executado.',
            );
          }
        }
      }
      process.exitCode = 0;
      return;
    }

    if (redisUrl !== '' && !chaptersOk) {
      const progressOnly = await tryRedisProgress(redisUrl, slug);
      if (progressOnly !== null) {
        const st = readStringField(progressOnly.state, 'status');
        lastRedisStatus = st;
        if (st === 'completed') {
          console.log('');
          console.log(
            'Fase 1 OK: Redis completed (capítulos ainda 0 no banco — incomum).',
          );
          if (!runCooldownCheck) {
            process.exitCode = 0;
            return;
          }
          const baseline = redisFingerprint(progressOnly.state);
          console.log('');
          console.log('2º GET mangas/:slug…');
          const second = await fetchJson(mangaUrl);
          if (!second.ok) {
            console.error(
              `2º GET falhou (${second.status}): ${JSON.stringify(second.body)}`,
            );
            process.exitCode = 1;
            return;
          }
          const changed = await watchSecondSyncEffect(
            redisUrl,
            slug,
            baseline,
            cooldownWatchMs,
          );
          console.log('');
          console.log(
            changed
              ? `Resultado: Redis mudou → novo sync rodou.`
              : `Resultado: Redis estável → 2º sync ignorado (cooldown).`,
          );
          process.exitCode = 0;
          return;
        }
      }
    }

    await new Promise((r) => {
      setTimeout(r, POLL_INTERVAL_MS);
    });
  }

  console.error('');
  console.error(
    'Timeout (fase 1): capítulos > 0 e (se Redis) completed não alcançados.',
  );
  console.error(`Último total de capítulos visto: ${lastTotal ?? 'n/d'}`);
  if (redisUrl !== '') {
    console.error(
      `Último status Redis visto: ${lastRedisStatus ?? 'sem chave'}`,
    );
  }
  console.error(
    'Dicas: slug válido na Nexustoons; Postgres; aumente SYNC_SMOKE_MAX_WAIT_MS.',
  );
  process.exitCode = 1;
}

void main();
