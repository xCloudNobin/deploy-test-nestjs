import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { SeedFlag } from '../seed/entities/seed-flag.entity';
import { AppConfigModule, APP_CONFIG } from '../config/config.module';
import { AppConfig } from '../config';
import { DatabaseService } from './database.service';
import { DATA_SOURCE } from './data-source.token';

@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: DATA_SOURCE,
      useFactory: (config: AppConfig): DataSource =>
        new DataSource({
          type: 'better-sqlite3',
          database: config.dbPath,
          entities: [Project, Task, SeedFlag],
          synchronize: true,
          logging: false,
        }),
      inject: [APP_CONFIG],
    },
    DatabaseService,
  ],
  exports: [DATA_SOURCE, DatabaseService],
})
export class DatabaseModule {}