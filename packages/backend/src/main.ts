import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { AppModule } from './app.module';
import { SpaFallbackFilter } from './common/filters/spa-fallback.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1', { exclude: [{ path: 'health', method: RequestMethod.GET }] });

  // SPA fallback for non-API 404s
  app.useGlobalFilters(new SpaFallbackFilter());

  const config = new DocumentBuilder()
    .setTitle('Nexus Panel API')
    .setDescription('Server management panel API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Serve frontend static files
  const frontendPath = join(__dirname, '..', '..', 'frontend', 'dist');
  const indexPath = resolve(frontendPath, 'index.html');
  const frontendBuilt = existsSync(indexPath);
  if (!frontendBuilt) {
    console.warn('WARNING: Frontend build not found at ' + indexPath + '. Run: cd packages/frontend && npm run build');
  }

  if (frontendBuilt) {
    app.useStaticAssets(frontendPath);
  }

  const host = process.env.HOST || '0.0.0.0';
  const port = process.env.PORT || 3000;
  await app.listen(port, host);
  console.log(`Nexus Panel API running on http://${host}:${port}`);
}
bootstrap();
