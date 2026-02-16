import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AllocationEntity } from '../database/entities/allocation.entity';

@Injectable()
export class AllocationsService {
  constructor(
    @InjectRepository(AllocationEntity)
    private readonly allocationRepo: Repository<AllocationEntity>,
  ) {}

  async findByNode(nodeId: string, page = 1, perPage = 50) {
    const [data, total] = await this.allocationRepo.findAndCount({
      where: { nodeId },
      order: { port: 'ASC' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async create(nodeId: string, ip: string, portStart: number, portEnd: number) {
    if (portStart > portEnd) {
      throw new BadRequestException('portStart must be <= portEnd');
    }
    if (portEnd - portStart > 1000) {
      throw new BadRequestException('Cannot create more than 1000 allocations at once');
    }

    const allocations: AllocationEntity[] = [];
    for (let port = portStart; port <= portEnd; port++) {
      const exists = await this.allocationRepo.findOne({
        where: { nodeId, ip, port },
      });
      if (!exists) {
        allocations.push(
          this.allocationRepo.create({ nodeId, ip, port }),
        );
      }
    }

    return this.allocationRepo.save(allocations);
  }

  async delete(id: string) {
    const allocation = await this.allocationRepo.findOne({ where: { id } });
    if (!allocation) {
      throw new NotFoundException('Allocation not found');
    }
    if (allocation.serverId !== null) {
      throw new BadRequestException('Cannot delete an assigned allocation');
    }
    await this.allocationRepo.remove(allocation);
  }

  async assign(id: string, serverId: string) {
    const allocation = await this.allocationRepo.findOne({ where: { id } });
    if (!allocation) {
      throw new NotFoundException('Allocation not found');
    }
    allocation.serverId = serverId;
    return this.allocationRepo.save(allocation);
  }

  async unassign(id: string) {
    const allocation = await this.allocationRepo.findOne({ where: { id } });
    if (!allocation) {
      throw new NotFoundException('Allocation not found');
    }
    allocation.serverId = undefined;
    return this.allocationRepo.save(allocation);
  }
}
