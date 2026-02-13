import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './shared/infrastructure/filters/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Midgard Core API')
    .setDescription('API documentation for Midgard Core')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'Bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  if (document.components?.securitySchemes) {
    document.security = [{ Bearer: [] }];
  }

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/api-json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(document, null, 2));
  });

  httpAdapter.get('/docs', (req: Request, res: Response) => {
    const scalarConfig = {
      hideClientButton: false,
      showSidebar: true,
      showDeveloperTools: 'localhost',
      showToolbar: 'localhost',
      operationTitleSource: 'summary',
      theme: 'purple',
      persistAuth: true,
      telemetry: true,
      layout: 'modern',
      isEditable: false,
      isLoading: false,
      hideModels: false,
      documentDownloadType: 'both',
      hideTestRequestButton: false,
      hideSearch: false,
      showOperationId: false,
      hideDarkModeToggle: false,
      withDefaultFonts: true,
      defaultOpenAllTags: false,
      expandAllModelSections: false,
      expandAllResponses: false,
      orderSchemaPropertiesBy: 'alpha',
      orderRequiredPropertiesFirst: true,
      _integration: 'html',
      default: false,
      slug: 'api-1',
      title: 'Midgard Core API',
    };

    const scalarHtml = `<!DOCTYPE html>
<html>
<head>
  <title>API Reference - Midgard Core</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; }
  </style>
</head>
<body>
  <script
    id="api-reference"
    type="application/json"
    data-configuration='${JSON.stringify(scalarConfig)}'
  >${JSON.stringify(document)}</script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`;
    res.send(scalarHtml);
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const bootstrapLogger = new Logger('Bootstrap');
  bootstrapLogger.log('🚀 API Documentation:');
  bootstrapLogger.log(`   ✨ Scalar API Reference: http://localhost:${port}/docs`);
}
void bootstrap();
