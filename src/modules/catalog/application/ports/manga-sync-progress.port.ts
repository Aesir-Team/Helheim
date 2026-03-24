import type { CanonicalMangaType } from '../../../../shared/domain/manga-external.normalization';

export const MANGA_SYNC_PROGRESS = Symbol('MANGA_SYNC_PROGRESS');

/**
 * Estado publicado no Redis em `midgard:manga-sync:v1:{mangaType}:{slug}` (JSON).
 * URLs das páginas ficam no Prisma (`ChapterPage.imageUrl`); aqui só progresso e amostra.
 */
export interface MangaSyncProgressState {
  slug: string;
  mangaType: CanonicalMangaType;
  status: 'running' | 'completed' | 'timeout' | 'failed';
  startedAt: string;
  deadlineAt: string;
  /** Total de capítulos publicados na lista da fonte (denominador do progresso). */
  totalChapters: number;
  /** Já persistidos antes deste run + upserts neste run (numerador). */
  chaptersProcessed: number;
  lastChapterNumber: string | null;
  /** Até 3 URLs da última página processada (debug / painel). */
  lastImageUrlPreview: string[];
  updatedAt: string;
  errorMessage?: string;
}

export interface MangaSyncProgressPort {
  publish(state: MangaSyncProgressState): Promise<void>;
  getLatestBySlug(slug: string): Promise<MangaSyncProgressState | null>;
}
