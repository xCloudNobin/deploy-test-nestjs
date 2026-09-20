import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { DataSource, EntityTarget, ObjectLiteral, QueryRunner } from 'typeorm';
import { DATA_SOURCE } from './data-source.token';

/**
 * Owns the process-wide DataSource and exposes its lifecycle.
 *
 * The connection is opened lazily and a failure to open the database is NOT
 * fatal: the process stays alive so liveness keeps serving while readiness and
 * every database-backed route report the degraded state (503).
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  private connectionError: string | null = null;

  constructor(@Inject(DATA_SOURCE) private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.dataSource.initialize();
      await this.dataSource.query('PRAGMA foreign_keys = ON');
      this.logger.log(`database ready`);
    } catch (err) {
      this.connectionError = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `database unavailable, serving liveness only: ${this.connectionError}`,
      );
    }
  }

  get isReady(): boolean {
    return this.dataSource.isInitialized === true;
  }

  get error(): string | null {
    return this.connectionError;
  }

  get sqliteDatabase(): string | undefined {
    const options = this.dataSource.options as { database?: string };
    return options?.database;
  }

  repository<T extends ObjectLiteral>(target: EntityTarget<T>) {
    return this.dataSource.getRepository<T>(target);
  }

  async query<T>(sql: string, parameters?: unknown[]): Promise<T> {
    return this.dataSource.query<T>(sql, parameters);
  }

  createQueryRunner(): QueryRunner {
    return this.dataSource.createQueryRunner();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.logger.log('database closed');
    }
  }
}