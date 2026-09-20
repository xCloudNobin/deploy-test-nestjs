import { Module } from '@nestjs/common';
import { defaultConfig, AppConfig } from '../config';

export const APP_CONFIG = Symbol('APP_CONFIG');

export const AppConfigProvider = {
  provide: APP_CONFIG,
  useFactory: (): AppConfig => defaultConfig(),
};

@Module({
  providers: [AppConfigProvider],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}