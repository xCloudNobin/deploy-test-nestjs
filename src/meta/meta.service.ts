import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from '../config/config.module';
import { AppConfig } from '../config';

@Injectable()
export class MetaService {
  private readonly startedAt = new Date();
  private readonly platform = `${process.platform}/${process.arch}`;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  meta(): Record<string, unknown> {
    return {
      name: 'deploy-test-nestjs',
      description: 'NestJS taskboard fixture (TypeORM + SQLite)',
      release: this.config.buildMarker,
      startedAt: this.startedAt.toISOString(),
      uptimeSec: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
      runtime: {
        node: process.version,
        platform: this.platform,
      },
    };
  }
}