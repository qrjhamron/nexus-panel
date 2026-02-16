import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { NodeConnectionStatus } from '@nexus/shared';
import { NodeEntity } from '../database/entities/node.entity';
import { CreateNodeDto, UpdateNodeDto } from './dto';
import { NodeHeartbeatStore, HeartbeatData } from './node-heartbeat.store';

@Injectable()
export class NodesService {
  constructor(
    @InjectRepository(NodeEntity)
    private readonly nodeRepo: Repository<NodeEntity>,
    private readonly configService: ConfigService,
    private readonly heartbeatStore: NodeHeartbeatStore,
  ) {}

  async findAll(page = 1, perPage = 25, search?: string) {
    const where = search ? { name: Like(`%${search}%`) } : undefined;

    const [data, total] = await this.nodeRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
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

  async findById(id: string) {
    const node = await this.nodeRepo.findOne({
      where: { id },
      relations: ['allocations'],
    });
    if (!node) {
      throw new NotFoundException('Node not found');
    }
    return node;
  }

  async create(dto: CreateNodeDto) {
    const daemonTokenId = randomBytes(8).toString('hex');
    const daemonTokenPlain = uuidv4();
    const node = this.nodeRepo.create({
      ...dto,
      daemonTokenId,
      daemonToken: daemonTokenPlain,
    });
    const saved = await this.nodeRepo.save(node);
    return {
      node: {
        id: saved.id,
        name: saved.name,
        fqdn: saved.fqdn,
        daemonToken: daemonTokenPlain,
      },
      configurationToken: Buffer.from(
        JSON.stringify({
          nodeId: saved.id,
          token: `${daemonTokenId}.${daemonTokenPlain}`,
          panelUrl: this.configService.get('APP_URL', 'http://localhost:3000'),
        }),
      ).toString('base64'),
    };
  }

  async update(id: string, dto: UpdateNodeDto) {
    const node = await this.nodeRepo.findOne({ where: { id } });
    if (!node) {
      throw new NotFoundException('Node not found');
    }
    Object.assign(node, dto);
    return this.nodeRepo.save(node);
  }

  async delete(id: string) {
    const node = await this.nodeRepo.findOne({ where: { id } });
    if (!node) {
      throw new NotFoundException('Node not found');
    }
    await this.nodeRepo.remove(node);
  }

  async processHeartbeat(node: NodeEntity, data: Omit<HeartbeatData, 'receivedAt'>) {
    const wasOnline = this.heartbeatStore.isOnline(node.id);

    this.heartbeatStore.set(node.id, {
      ...data,
      receivedAt: new Date(),
    });

    if (!wasOnline && node.connectionStatus !== NodeConnectionStatus.CONNECTED) {
      await this.nodeRepo.update(node.id, {
        connectionStatus: NodeConnectionStatus.CONNECTED,
        wingsVersion: data.version,
      });
    }
  }

  async getHealth(id: string) {
    const node = await this.findById(id);
    const heartbeat = this.heartbeatStore.get(node.id);
    const online = this.heartbeatStore.isOnline(node.id);

    if (!online && node.connectionStatus === NodeConnectionStatus.CONNECTED) {
      await this.nodeRepo.update(node.id, {
        connectionStatus: NodeConnectionStatus.DISCONNECTED,
      });
    }

    return {
      nodeId: node.id,
      online,
      lastHeartbeat: heartbeat || null,
    };
  }

  getConfiguration(node: NodeEntity) {
    const appUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    return {
      nodeId: node.id,
      name: node.name,
      fqdn: node.fqdn,
      scheme: node.scheme,
      daemonPort: node.daemonPort,
      memory: node.memory,
      memoryOverallocate: node.memoryOverallocate,
      disk: node.disk,
      diskOverallocate: node.diskOverallocate,
      uploadSize: node.uploadSize,
      behindProxy: node.behindProxy,
      location: node.location,
      panelApiUrl: appUrl,
    };
  }

  async regenerateToken(id: string) {
    const node = await this.nodeRepo.findOne({ where: { id } });
    if (!node) {
      throw new NotFoundException('Node not found');
    }

    const daemonTokenId = randomBytes(8).toString('hex');
    const daemonTokenPlain = uuidv4();

    await this.nodeRepo.update(id, {
      daemonTokenId,
      daemonToken: daemonTokenPlain,
    });

    return {
      daemonTokenId,
      daemonToken: daemonTokenPlain,
      configurationToken: Buffer.from(
        JSON.stringify({
          nodeId: id,
          token: `${daemonTokenId}.${daemonTokenPlain}`,
          panelUrl: this.configService.get('APP_URL', 'http://localhost:3000'),
        }),
      ).toString('base64'),
    };
  }
}
