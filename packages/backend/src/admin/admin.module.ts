import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServerEntity } from '../database/entities/server.entity';
import { UserEntity } from '../database/entities/user.entity';
import { NodeEntity } from '../database/entities/node.entity';
import { AllocationEntity } from '../database/entities/allocation.entity';
import { ApiKeyEntity } from '../database/entities/api-key.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminNodesController } from './admin-nodes.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminAllocationsController } from './admin-allocations.controller';
import { NodesModule } from '../nodes/nodes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServerEntity, UserEntity, NodeEntity, AllocationEntity, ApiKeyEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'nexus-dev-secret-change-in-production'),
      }),
    }),
    NodesModule,
  ],
  controllers: [AdminController, AdminNodesController, AdminUsersController, AdminAllocationsController],
  providers: [AdminService],
})
export class AdminModule {}
