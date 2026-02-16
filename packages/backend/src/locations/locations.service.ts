import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationEntity } from '../database/entities/location.entity';
import { NodeEntity } from '../database/entities/node.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(LocationEntity)
    private readonly locationRepo: Repository<LocationEntity>,
    @InjectRepository(NodeEntity)
    private readonly nodeRepo: Repository<NodeEntity>,
  ) {}

  async findAll() {
    const locations = await this.locationRepo
      .createQueryBuilder('location')
      .loadRelationCountAndMap('location.nodeCount', 'location.nodes')
      .orderBy('location.short', 'ASC')
      .getMany();

    return locations;
  }

  async findById(id: string) {
    const location = await this.locationRepo.findOne({
      where: { id },
      relations: ['nodes'],
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return location;
  }

  async create(short: string, long: string) {
    if (!/^[A-Z0-9-]+$/.test(short)) {
      throw new BadRequestException('Short code must be uppercase alphanumeric (hyphens allowed)');
    }

    const existing = await this.locationRepo.findOne({ where: { short } });
    if (existing) {
      throw new ConflictException('Location short code already exists');
    }

    const location = this.locationRepo.create({ short, long });
    return this.locationRepo.save(location);
  }

  async update(id: string, short?: string, long?: string) {
    const location = await this.locationRepo.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    if (short !== undefined) {
      if (!/^[A-Z0-9-]+$/.test(short)) {
        throw new BadRequestException('Short code must be uppercase alphanumeric (hyphens allowed)');
      }
      const conflict = await this.locationRepo.findOne({ where: { short } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException('Location short code already exists');
      }
      location.short = short;
    }

    if (long !== undefined) {
      location.long = long;
    }

    return this.locationRepo.save(location);
  }

  async delete(id: string) {
    const location = await this.locationRepo.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const nodeCount = await this.nodeRepo.count({ where: { locationId: id } });
    if (nodeCount > 0) {
      throw new BadRequestException(
        `Cannot delete location: ${nodeCount} node(s) are still assigned to it`,
      );
    }

    await this.locationRepo.remove(location);
  }
}
