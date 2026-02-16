import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ServerEntity } from '../database/entities/server.entity';
import { UserEntity } from '../database/entities/user.entity';
import { EggEntity } from '../database/entities/egg.entity';
import { NodeEntity } from '../database/entities/node.entity';
import { NestEntity } from '../database/entities/nest.entity';
@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(ServerEntity)
    private readonly serverRepo: Repository<ServerEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(EggEntity)
    private readonly eggRepo: Repository<EggEntity>,
    @InjectRepository(NodeEntity)
    private readonly nodeRepo: Repository<NodeEntity>,
  ) {}

  async globalSearch(query: string, userId: string, isAdmin: boolean) {
    const searchPattern = `%${query}%`;

    // Search servers (user sees own, admin sees all)
    const serverQb = this.serverRepo
      .createQueryBuilder('server')
      .select(['server.id', 'server.uuid', 'server.name', 'server.powerState'])
      .where('server.name ILIKE :q', { q: searchPattern });

    if (!isAdmin) {
      serverQb.andWhere('server.userId = :userId', { userId });
    }

    const servers = await serverQb.take(10).getMany();

    // Search users (admin only)
    let users: any[] = [];
    if (isAdmin) {
      users = await this.userRepo.find({
        where: [
          { username: Like(searchPattern) },
          { email: Like(searchPattern) },
        ],
        select: ['id', 'username', 'email'],
        take: 10,
      });
    }

    // Search eggs
    const eggs = await this.eggRepo
      .createQueryBuilder('egg')
      .leftJoinAndSelect('egg.nest', 'nest')
      .where('egg.name ILIKE :q', { q: searchPattern })
      .select(['egg.id', 'egg.name', 'nest.name'])
      .take(10)
      .getMany();

    // Search nodes (admin only)
    let nodes: any[] = [];
    if (isAdmin) {
      nodes = await this.nodeRepo.find({
        where: [
          { name: Like(searchPattern) },
          { fqdn: Like(searchPattern) },
        ],
        select: ['id', 'name', 'fqdn'],
        take: 10,
      });
    }

    return {
      servers: servers.map((s) => ({
        id: s.id,
        uuid: s.uuid,
        name: s.name,
        status: s.status,
      })),
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
      })),
      eggs: eggs.map((e) => ({
        id: e.id,
        name: e.name,
        nestName: e.nest?.name || '',
      })),
      nodes: nodes.map((n) => ({
        id: n.id,
        name: n.name,
        fqdn: n.fqdn,
      })),
    };
  }
}
