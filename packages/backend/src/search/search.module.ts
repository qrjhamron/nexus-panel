import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServerEntity } from '../database/entities/server.entity';
import { UserEntity } from '../database/entities/user.entity';
import { EggEntity } from '../database/entities/egg.entity';
import { NodeEntity } from '../database/entities/node.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServerEntity, UserEntity, EggEntity, NodeEntity]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
