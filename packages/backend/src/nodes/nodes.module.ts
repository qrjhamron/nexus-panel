import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodeEntity } from '../database/entities/node.entity';
import { NodesService } from './nodes.service';
import { NodesController } from './nodes.controller';
import { NodeHeartbeatStore } from './node-heartbeat.store';
import { DaemonTokenGuard } from '../common/guards/daemon-token.guard';

@Module({
  imports: [TypeOrmModule.forFeature([NodeEntity])],
  controllers: [NodesController],
  providers: [NodesService, NodeHeartbeatStore, DaemonTokenGuard],
  exports: [NodesService, NodeHeartbeatStore],
})
export class NodesModule {}
