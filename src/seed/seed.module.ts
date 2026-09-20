import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SeedService } from './seed.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}