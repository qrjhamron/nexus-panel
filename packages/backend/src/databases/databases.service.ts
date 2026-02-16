import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ServerDatabaseEntity } from '../database/entities/server-database.entity';
import { CreateDatabaseDto } from './dto';

@Injectable()
export class DatabasesService {
  constructor(
    @InjectRepository(ServerDatabaseEntity)
    private readonly dbRepo: Repository<ServerDatabaseEntity>,
  ) {}

  async findByServer(serverId: string) {
    return this.dbRepo.find({
      where: { serverId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(serverId: string, dto: CreateDatabaseDto) {
    const shortId = uuidv4().replace(/-/g, '').substring(0, 8);
    const name = dto.database || `s${shortId}_db`;
    const username = `u${shortId}`;
    const password = uuidv4().replace(/-/g, '');

    const db = this.dbRepo.create({
      serverId,
      databaseHostId: dto.databaseHostId,
      database: name,
      username,
      password,
      remote: dto.remote ?? '%',
      maxConnections: dto.maxConnections ?? 0,
    });

    return this.dbRepo.save(db);
  }

  async delete(id: string) {
    const db = await this.dbRepo.findOne({ where: { id } });
    if (!db) {
      throw new NotFoundException('Database not found');
    }
    await this.dbRepo.remove(db);
  }
}
