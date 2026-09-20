import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { SeedFlag } from './entities/seed-flag.entity';

const SEED_NAME = 'taskboard-baseline';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly database: DatabaseService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.database.isReady) {
      this.logger.warn('seed skipped: database unavailable');
      return;
    }
    try {
      await this.seedOnce();
    } catch (err) {
      this.logger.error(`seed failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async seedOnce(): Promise<void> {
    const flagRepo = this.database.repository(SeedFlag);
    const applied = await flagRepo.findOneBy({ name: SEED_NAME });
    if (applied) {
      this.logger.log(`seed already applied (${SEED_NAME}), skipping`);
      return;
    }

    const projectRepo = this.database.repository(Project);
    const taskRepo = this.database.repository(Task);

    const launch = await projectRepo.save(
      projectRepo.create({
        name: 'Launch checklist',
        description: 'Getting the product out the door.',
        status: 'active',
      }),
    );
    const migration = await projectRepo.save(
      projectRepo.create({
        name: 'Platform migration',
        description: 'Moving services across to the new stack.',
        status: 'active',
      }),
    );

    await taskRepo.save([
      taskRepo.create({ projectId: launch.id, title: 'Write release notes', status: 'todo', priority: 'medium' }),
      taskRepo.create({ projectId: launch.id, title: 'Run final QA pass', status: 'in_progress', priority: 'high' }),
      taskRepo.create({ projectId: launch.id, title: 'Announce to community', status: 'todo', priority: 'low' }),
      taskRepo.create({ projectId: migration.id, title: 'Migrate taskboard data', status: 'in_progress', priority: 'high' }),
      taskRepo.create({ projectId: migration.id, title: 'Decommission old worker', status: 'todo', priority: 'low' }),
    ]);

    await flagRepo.save(flagRepo.create({ name: SEED_NAME, appliedAt: new Date().toISOString() }));
    this.logger.log('seed data applied (Launch checklist, Platform migration)');
  }
}