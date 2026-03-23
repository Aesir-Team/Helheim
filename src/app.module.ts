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
import { ListsApplicationModule } from './modules/lists/application/lists.application.module';
import { ProgressApplicationModule } from './modules/progress/application/progress.application.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthApplicationModule,
    CatalogApplicationModule,
    ListsApplicationModule,
    ProgressApplicationModule,
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
