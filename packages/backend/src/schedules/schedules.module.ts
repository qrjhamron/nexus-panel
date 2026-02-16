import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleEntity } from '../database/entities/schedule.entity';
import { ScheduleTaskEntity } from '../database/entities/schedule-task.entity';
import { ServersModule } from '../servers/servers.module';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduleEntity, ScheduleTaskEntity]),
    ServersModule,
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
})
export class SchedulesModule {}
