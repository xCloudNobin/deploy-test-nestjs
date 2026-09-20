import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { configureApplication } from './app.configure';
import { defaultConfig } from './config';
import { join } from 'node:path';

async function bootstrap(): Promise<void> {
  const config = defaultConfig();
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  configureApplication(app);

  // Serve the public/ UI at the HTTP root. Nested client routes are handled
  // by the single-page client using the History API; the API lives under /api.
  app.useStaticAssets(join(config.projectRoot, 'public'), {
    index: 'index.html',
  });

  // SPA fallback: extensionless nested routes (e.g. /projects/3) serve the
  // index page so reloads and deep links work; unknown static files (with an
  // extension) still 404.
  const indexHtml = join(config.projectRoot, 'public', 'index.html');
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const hasExtension = pathname.split('/').pop()?.includes('.');
    if (hasExtension) return next();
    if (pathname.startsWith('/api/')) return next();
    return res.sendFile(indexHtml);
  });

  await app.listen(config.port, config.bindHost);

  logger.log(`release ${config.buildMarker} listening on http://${config.bindHost}:${config.port}`);
  logger.log(`database path: ${config.dbPath}`);
}

void bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`[taskboard] FATAL: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});