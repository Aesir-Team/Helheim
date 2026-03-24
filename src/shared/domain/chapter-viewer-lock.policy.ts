import { isPrivilegedCatalogReaderRole } from './catalog-privileged-roles';

export interface ChapterLockAwareSummary {
  readonly id: string;
  readonly accessLevel: string;
  readonly isLocked: boolean;
}

/**
 * Ajusta `isLocked` para o viewer: papéis privilegiados ou capítulos já desbloqueados
 * aparecem como abertos na UI (o conteúdo continua protegido em `GET /chapters/:id`).
 */
export function applyViewerChapterLockFlags<T extends ChapterLockAwareSummary>(
  items: readonly T[],
  viewer: { userId: string; role: string } | null,
  unlockedChapterIds: ReadonlySet<string>,
): T[] {
  return items.map((c) => {
    if (c.accessLevel !== 'coin') {
      return c;
    }
    if (viewer != null && isPrivilegedCatalogReaderRole(viewer.role)) {
      return { ...c, isLocked: false };
    }
    if (viewer != null && unlockedChapterIds.has(c.id)) {
      return { ...c, isLocked: false };
    }
    return c;
  });
}
