import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { AuthApplicationModule } from './modules/auth/application/auth.application.module';
import { AuthController } from './modules/auth/presentation/controllers/auth.controller';
import { CatalogApplicationModule } from './modules/catalog/application/catalog.application.module';
import { CatalogController } from './modules/catalog/presentation/controllers/catalog.controller';
import { ChapterReadingController } from './modules/catalog/presentation/controllers/chapter-reading.controller';
import { LibraryApplicationModule } from './modules/library/application/library.application.module';
import { SourcesApplicationModule } from './modules/sources/application/sources.application.module';
import { IngestionApplicationModule } from './modules/ingestion/application/ingestion.application.module';
import { GovernanceApplicationModule } from './modules/governance/application/governance.application.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthApplicationModule,
    CatalogApplicationModule,
    LibraryApplicationModule,
    SourcesApplicationModule,
    IngestionApplicationModule,
    GovernanceApplicationModule,
  ],
  controllers: [
    AppController,
    AuthController,
    CatalogController,
    ChapterReadingController,
  ],
  providers: [AppService],
})
export class AppModule {}
