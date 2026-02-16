import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServerSubuserEntity } from '../database/entities/server-subuser.entity';
import { UserEntity } from '../database/entities/user.entity';
import { ServersModule } from '../servers/servers.module';
import { SubusersService } from './subusers.service';
import { SubusersController } from './subusers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServerSubuserEntity, UserEntity]),
    ServersModule,
  ],
  controllers: [SubusersController],
  providers: [SubusersService],
})
export class SubusersModule {}
