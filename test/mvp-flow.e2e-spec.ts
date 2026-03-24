import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { ensureMvpFixtures, MVP_DEMO_MANGA_SLUG } from '../prisma/mvp-fixtures';
import { createE2eApp } from './create-e2e-app';

interface AuthTokenBody {
  token: string;
  user: { email: string };
}

interface PaginatedMangasBody {
  data: unknown[];
  total: number;
}

interface MangaDetailBody {
  slug: string;
  chaptersCount: number;
}

interface PaginatedChaptersBody {
  data: {
    id: string;
    accessLevel: string;
    number: string;
    isLocked: boolean;
  }[];
}

interface ChapterReadingBody {
  id: string;
  pages: unknown[];
}

/**
 * PLANO-MVP G.1: registro → token → catálogo → capítulo para leitura.
 * Requer: `migrate deploy` + `db:seed` no mesmo banco de `DATABASE_URL`.
 */
describe('MVP flow (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const prisma = new PrismaClient();
    await ensureMvpFixtures(prisma);
    await prisma.$disconnect();
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('register → GET manga por slug (seed) → list chapters (public + coin, ordem natural) → GET chapter public sem JWT e com JWT', async () => {
    const email = `e2e-${Date.now()}@midgard.local`;
    const password = 'senha-e2e-12';

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        firstName: 'E2E',
        lastName: 'User',
        nickname: `e2e_main_${String(Date.now())}`,
      })
      .expect(201);

    const regBody = reg.body as AuthTokenBody;
    const token = regBody.token;
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/mangas')
      .query({ limit: 5, page: 1 })
      .expect(200);
    const listBody = listRes.body as PaginatedMangasBody;
    expect(Array.isArray(listBody.data)).toBe(true);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/mangas/${MVP_DEMO_MANGA_SLUG}`)
      .expect(200);

    const detailBody = detail.body as MangaDetailBody;
    expect(detailBody.slug).toBe(MVP_DEMO_MANGA_SLUG);
    expect(detailBody.chaptersCount).toBeGreaterThanOrEqual(1);

    const chapters = await request(app.getHttpServer())
      .get(`/api/v1/mangas/${MVP_DEMO_MANGA_SLUG}/chapters`)
      .expect(200);

    const chData = (chapters.body as PaginatedChaptersBody).data;
    expect(chData.length).toBeGreaterThanOrEqual(2);
    expect(chData.some((c) => c.accessLevel === 'public')).toBe(true);
    expect(chData.some((c) => c.accessLevel === 'coin')).toBe(true);
    expect(chData.some((c) => c.isLocked === true)).toBe(true);

    const nums = chData.map((c) => c.number);
    const sorted = [...nums].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
    expect(nums).toEqual(sorted);

    const publicChapter = chData.find((c) => c.accessLevel === 'public');
    expect(publicChapter).toBeDefined();
    const chapterId = publicChapter!.id;

    const readGuest = await request(app.getHttpServer())
      .get(`/api/v1/chapters/${chapterId}`)
      .expect(200);
    const readGuestBody = readGuest.body as ChapterReadingBody;
    expect(readGuestBody.id).toBe(chapterId);
    expect(Array.isArray(readGuestBody.pages)).toBe(true);
    expect(readGuestBody.pages.length).toBeGreaterThanOrEqual(1);

    const read = await request(app.getHttpServer())
      .get(`/api/v1/chapters/${chapterId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const readBody = read.body as ChapterReadingBody;
    expect(readBody.id).toBe(chapterId);
    expect(Array.isArray(readBody.pages)).toBe(true);
    expect(readBody.pages.length).toBeGreaterThanOrEqual(1);

    const coinChapter = chData.find((c) => c.accessLevel === 'coin');
    expect(coinChapter).toBeDefined();
    const coinRead = await request(app.getHttpServer())
      .get(`/api/v1/chapters/${coinChapter!.id}`)
      .expect(403);
    expect(coinRead.body).toMatchObject({
      statusCode: 403,
      reason: 'authentication_required',
    });
  });

  it('login retorna token para usuário existente', async () => {
    const email = `e2e-login-${Date.now()}@midgard.local`;
    const password = 'senha-e2e-12';

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        firstName: 'L',
        lastName: 'G',
        nickname: `e2e_login_${String(Date.now())}`,
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const loginBody = login.body as AuthTokenBody;
    expect(loginBody.token).toBeDefined();
    expect(loginBody.user.email).toBe(email);
  });
});
