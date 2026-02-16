import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllocationEntity } from '../database/entities/allocation.entity';
import { AllocationsService } from './allocations.service';
import { AllocationsController } from './allocations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AllocationEntity])],
  controllers: [AllocationsController],
  providers: [AllocationsService],
  exports: [AllocationsService],
})
export class AllocationsModule {}
