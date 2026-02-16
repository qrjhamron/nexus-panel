import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EggEntity } from '../database/entities/egg.entity';
import { EggVariableEntity } from '../database/entities/egg-variable.entity';
import { NestEntity } from '../database/entities/nest.entity';
import { EggsService } from './eggs.service';
import { EggsController } from './eggs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EggEntity, EggVariableEntity, NestEntity])],
  controllers: [EggsController],
  providers: [EggsService],
  exports: [EggsService],
})
export class EggsModule {}
