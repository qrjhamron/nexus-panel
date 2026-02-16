import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServerDatabaseEntity } from '../database/entities/server-database.entity';
import { ServersModule } from '../servers/servers.module';
import { DatabasesService } from './databases.service';
import { DatabasesController } from './databases.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServerDatabaseEntity]),
    ServersModule,
  ],
  controllers: [DatabasesController],
  providers: [DatabasesService],
})
export class DatabasesModule {}
