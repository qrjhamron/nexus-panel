import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WingsService } from './wings.service';
import { EventHandlers } from './event-handlers';
import { ServerEntity } from '../database/entities/server.entity';
import { SseModule } from '../sse/sse.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([ServerEntity]),
    SseModule,
  ],
  providers: [WingsService, EventHandlers],
  exports: [WingsService, EventHandlers],
})
export class WingsModule {}
