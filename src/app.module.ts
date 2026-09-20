import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MetaModule } from './meta/meta.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    SeedModule,
    HealthModule,
    MetaModule,
    ProjectsModule,
    TasksModule,
  ],
})
export class AppModule {}