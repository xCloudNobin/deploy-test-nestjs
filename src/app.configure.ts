import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Applies the production application wiring that is shared between the real
 * bootstrap and the e2e suite: global prefix, validation pipe and shutdown
 * hooks. Static assets are only mounted by the real bootstrap, because the
 * test suite exercises the JSON API only.
 */
export function configureApplication(app: NestExpressApplication): void {
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      whitelist: true,
      forbidNonWhitelisted: false,
      validationError: { target: false, value: false },
    }),
  );
}