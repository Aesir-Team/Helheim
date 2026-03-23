import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { AuthApplicationModule } from './modules/auth/application/auth.application.module';
import { AuthController } from './modules/auth/presentation/controllers/auth.controller';
import { CatalogInfrastructureModule } from './modules/catalog/infrastructure/catalog.infrastructure.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthApplicationModule,
    CatalogInfrastructureModule,
  ],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule {}
