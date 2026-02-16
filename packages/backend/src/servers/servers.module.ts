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
import { NodesModule } from '../nodes/nodes.module';

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
  controllers: [ServersController],
  providers: [ServersService],
  exports: [ServersService],
})
export class ServersModule {}
