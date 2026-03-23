import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/infrastructure/prisma/prisma.module';
import { AuthApplicationModule } from '../../auth/application/auth.application.module';
import { CatalogApplicationModule } from '../../catalog/application/catalog.application.module';
import { READING_PROGRESS_REPOSITORY } from './ports/reading-progress.repository.port';
import { PrismaReadingProgressRepository } from '../infrastructure/persistence/prisma-reading-progress.repository';
import { SaveReadingProgressUseCase } from './use-cases/save-reading-progress.use-case';
import { GetContinueReadingUseCase } from './use-cases/get-continue-reading.use-case';
import { ReadingProgressController } from '../presentation/controllers/reading-progress.controller';

@Module({
  imports: [PrismaModule, AuthApplicationModule, CatalogApplicationModule],
  controllers: [ReadingProgressController],
  providers: [
    {
      provide: READING_PROGRESS_REPOSITORY,
      useClass: PrismaReadingProgressRepository,
    },
    SaveReadingProgressUseCase,
    GetContinueReadingUseCase,
  ],
})
export class ProgressApplicationModule {}
