import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/infrastructure/prisma/prisma.module';
import { AccessApplicationModule } from '../../access/application/access.application.module';
import { ProgressApplicationModule } from '../../progress/application/progress.application.module';
import { CatalogInfrastructureModule } from '../infrastructure/catalog.infrastructure.module';

import { MANGA_REPOSITORY } from './ports/manga.repository.port';
import { CHAPTER_REPOSITORY } from './ports/chapter.repository.port';
import { CATEGORY_REPOSITORY } from './ports/category.repository.port';

import { PrismaMangaRepository } from '../infrastructure/persistence/prisma-manga.repository';
import { PrismaChapterRepository } from '../infrastructure/persistence/prisma-chapter.repository';
import { PrismaCategoryRepository } from '../infrastructure/persistence/prisma-category.repository';

import { ListMangasUseCase } from './use-cases/list-mangas.use-case';
import { GetHomeFeedUseCase } from './use-cases/get-home-feed.use-case';
import { GetMangaSyncStatusUseCase } from './use-cases/get-manga-sync-status.use-case';
import { GetMangaBySlugUseCase } from './use-cases/get-manga-by-slug.use-case';
import { ListChaptersUseCase } from './use-cases/list-chapters.use-case';
import { GetChapterSummaryByMangaSlugAndNumberUseCase } from './use-cases/get-chapter-summary-by-manga-slug-and-number.use-case';
import { ListCategoriesUseCase } from './use-cases/list-categories.use-case';
import { SyncMangaFromSourceUseCase } from './use-cases/sync-manga-from-source.use-case';
import { GetChapterForReadingUseCase } from './use-cases/get-chapter-for-reading.use-case';
import { ChapterSummariesViewerLockApplier } from './services/chapter-summaries-viewer-lock.applier';

@Module({
  imports: [
    PrismaModule,
    CatalogInfrastructureModule,
    AccessApplicationModule,
    forwardRef(() => ProgressApplicationModule),
  ],
  providers: [
    { provide: MANGA_REPOSITORY, useClass: PrismaMangaRepository },
    { provide: CHAPTER_REPOSITORY, useClass: PrismaChapterRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
    GetHomeFeedUseCase,
    GetMangaSyncStatusUseCase,
    ListMangasUseCase,
    GetMangaBySlugUseCase,
    ListChaptersUseCase,
    GetChapterSummaryByMangaSlugAndNumberUseCase,
    ListCategoriesUseCase,
    SyncMangaFromSourceUseCase,
    GetChapterForReadingUseCase,
    ChapterSummariesViewerLockApplier,
  ],
  exports: [
    MANGA_REPOSITORY,
    CHAPTER_REPOSITORY,
    GetHomeFeedUseCase,
    GetMangaSyncStatusUseCase,
    ListMangasUseCase,
    GetMangaBySlugUseCase,
    ListChaptersUseCase,
    GetChapterSummaryByMangaSlugAndNumberUseCase,
    ListCategoriesUseCase,
    SyncMangaFromSourceUseCase,
    GetChapterForReadingUseCase,
  ],
})
export class CatalogApplicationModule {}
