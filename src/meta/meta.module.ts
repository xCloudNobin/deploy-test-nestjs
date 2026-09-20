import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';

@Module({
  imports: [AppConfigModule],
  controllers: [MetaController],
  providers: [MetaService],
})
export class MetaModule {}