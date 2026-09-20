import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get('live')
  live(): { status: string; uptime: number } {
    return { status: 'ok', uptime: Math.floor(process.uptime()) };
  }

  @Get('ready')
  async ready(): Promise<{ status: string; database: string }> {
    if (this.database.isReady) {
      try {
        await this.database.query('SELECT 1 AS ok');
      } catch (err) {
        throw new ServiceUnavailableException({
          status: 'unavailable',
          database: 'down',
          reason: err instanceof Error ? err.message : String(err),
        });
      }
      return { status: 'ready', database: 'up' };
    }
    throw new ServiceUnavailableException({
      status: 'unavailable',
      database: 'down',
      reason: this.database.error ?? 'not initialized',
    });
  }
}