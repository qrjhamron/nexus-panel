import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServerEntity } from '../database/entities/server.entity';
import { AllocationEntity } from '../database/entities/allocation.entity';
import { EggEntity } from '../database/entities/egg.entity';
import { EggVariableEntity } from '../database/entities/egg-variable.entity';
import { NodeEntity } from '../database/entities/node.entity';
import { UserEntity } from '../database/entities/user.entity';
import { ServersService } from './servers.service';
import { ServersController } from './servers.controller';
import { ServerCallbacksController } from './server-callbacks.controller';
import { NodesModule } from '../nodes/nodes.module';
import { DaemonTokenGuard } from '../common/guards/daemon-token.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServerEntity,
      AllocationEntity,
      EggEntity,
      EggVariableEntity,
      NodeEntity,
      UserEntity,
    ]),
    NodesModule,
  ],
  controllers: [ServersController, ServerCallbacksController],
  providers: [ServersService, DaemonTokenGuard],
  exports: [ServersService],
})
export class ServersModule {}
