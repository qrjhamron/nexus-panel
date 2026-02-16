import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServerEntity, ServerStatus } from '../database/entities/server.entity';
import { AllocationEntity } from '../database/entities/allocation.entity';
import { EggEntity } from '../database/entities/egg.entity';
import { EggVariableEntity } from '../database/entities/egg-variable.entity';
import { NodeEntity } from '../database/entities/node.entity';
import { UserEntity } from '../database/entities/user.entity';
import { WingsService } from '../wings/wings.service';
import { NodeHeartbeatStore } from '../nodes/node-heartbeat.store';
import { validateServerVariables } from '../common/utils/variable-validator';
import { CreateServerDto, UpdateServerDto } from './dto';
import { PowerAction, WingsServerConfig } from '@nexus/shared';

@Injectable()
export class ServersService {
  private readonly logger = new Logger(ServersService.name);

  constructor(
    @InjectRepository(ServerEntity)
    private readonly serverRepo: Repository<ServerEntity>,
    @InjectRepository(AllocationEntity)
    private readonly allocationRepo: Repository<AllocationEntity>,
    @InjectRepository(EggEntity)
    private readonly eggRepo: Repository<EggEntity>,
    @InjectRepository(EggVariableEntity)
    private readonly eggVariableRepo: Repository<EggVariableEntity>,
    @InjectRepository(NodeEntity)
    private readonly nodeRepo: Repository<NodeEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly wingsService: WingsService,
    private readonly heartbeatStore: NodeHeartbeatStore,
  ) {}

  async findAll(
    page = 1,
    perPage = 25,
    userId?: string,
    isAdmin = false,
    search?: string,
  ) {
    const qb = this.serverRepo
      .createQueryBuilder('server')
      .leftJoinAndSelect('server.node', 'node')
      .leftJoinAndSelect('server.egg', 'egg')
      .leftJoinAndSelect('server.allocation', 'allocation')
      .leftJoinAndSelect('server.user', 'user');

    if (!isAdmin && userId) {
      qb.where('server.userId = :userId', { userId });
    }

    if (search) {
      qb.andWhere('server.name ILIKE :search', { search: `%${search}%` });
    }

    qb.orderBy('server.createdAt', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage);

    const [data, total] = await qb.getManyAndCount();

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

  async findByUuid(uuid: string) {
    const server = await this.serverRepo.findOne({
      where: { uuid },
      relations: ['node', 'egg', 'allocation', 'user'],
    });
    if (!server) {
      throw new NotFoundException('Server not found');
    }
    return server;
  }

  async findById(id: string) {
    const server = await this.serverRepo.findOne({
      where: { id },
      relations: ['node', 'egg', 'allocation', 'user'],
    });
    if (!server) {
      throw new NotFoundException('Server not found');
    }
    return server;
  }

  async create(dto: CreateServerDto) {
    // 1. Validate node exists and is online
    const node = await this.nodeRepo.findOne({ where: { id: dto.nodeId } });
    if (!node) {
      throw new NotFoundException('Node not found');
    }
    if (!this.heartbeatStore.isOnline(node.id)) {
      throw new BadRequestException('Node is offline');
    }

    // Verify Wings is actually reachable
    const wingsAvailable = await this.wingsService.checkAvailability(node);
    if (!wingsAvailable) {
      throw new BadRequestException('Wings daemon is not reachable on this node');
    }

    // 2. Validate egg exists
    const egg = await this.eggRepo.findOne({ where: { id: dto.eggId } });
    if (!egg) {
      throw new NotFoundException('Egg not found');
    }

    // 3. Validate allocation exists, belongs to node, and is unassigned
    const allocation = await this.allocationRepo.findOne({ where: { id: dto.allocationId } });
    if (!allocation) {
      throw new NotFoundException('Allocation not found');
    }
    if (allocation.nodeId !== dto.nodeId) {
      throw new BadRequestException('Allocation does not belong to the specified node');
    }
    if (allocation.serverId) {
      throw new BadRequestException('Allocation is already assigned to a server');
    }

    // 4. Validate owner user exists
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 5. Validate memory capacity (considering overallocation) — aggregate query
    const capacityResult = await this.serverRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.memory), 0)', 'allocatedMemory')
      .addSelect('COALESCE(SUM(s.disk), 0)', 'allocatedDisk')
      .where('s.nodeId = :nodeId', { nodeId: dto.nodeId })
      .getRawOne();
    const allocatedMemory = Number(capacityResult.allocatedMemory);
    const maxMemory = node.memory * (1 + node.memoryOverallocate / 100);
    if (allocatedMemory + dto.memory > maxMemory) {
      throw new BadRequestException(
        `Not enough memory on node. Available: ${Math.floor(maxMemory - allocatedMemory)}MB, Requested: ${dto.memory}MB`,
      );
    }

    // 6. Validate disk capacity (considering overallocation)
    const allocatedDisk = Number(capacityResult.allocatedDisk);
    const maxDisk = node.disk * (1 + node.diskOverallocate / 100);
    if (allocatedDisk + dto.disk > maxDisk) {
      throw new BadRequestException(
        `Not enough disk on node. Available: ${Math.floor(maxDisk - allocatedDisk)}MB, Requested: ${dto.disk}MB`,
      );
    }

    // 7. Resolve egg variables: merge defaults with provided values, validate
    const eggVariables = await this.eggVariableRepo.find({ where: { eggId: dto.eggId } });
    const envVariables: Record<string, string> = {};
    for (const v of eggVariables) {
      envVariables[v.envVariable] = dto.envVariables?.[v.envVariable] ?? v.defaultValue;
    }

    const validation = validateServerVariables(envVariables, eggVariables);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Variable validation failed',
        errors: validation.errors,
      });
    }

    // 8. Build startup command by substituting {{VAR_NAME}} placeholders
    let startup = egg.startup;
    for (const [key, value] of Object.entries(envVariables)) {
      startup = startup.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    // 9. Determine image
    const image = dto.image || egg.dockerImage;

    // 10-11. Use transaction for atomic server creation + allocation assignment
    let saved: ServerEntity;
    const runner = this.serverRepo.manager.connection.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const server = this.serverRepo.create({
        ...dto,
        startup,
        image,
        envVariables,
        status: ServerStatus.INSTALLING,
        installed: 0,
      });
      saved = await runner.manager.save(server);
      await runner.manager.update(AllocationEntity, dto.allocationId, { serverId: saved.id });
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }

    const fullServer = await this.findById(saved.id);

    // 12. Send creation command to Wings
    try {
      const config: WingsServerConfig = {
        uuid: fullServer.uuid,
        dockerImage: fullServer.image,
        startupCommand: fullServer.startup,
        environment: fullServer.envVariables || {},
        memoryLimit: fullServer.memory,
        cpuLimit: fullServer.cpu,
        diskLimit: fullServer.disk,
        portMappings: [
          {
            hostPort: fullServer.allocation.port,
            containerPort: fullServer.allocation.port,
          },
        ],
        volumePath: `/srv/daemon-data/${fullServer.uuid}`,
      };
      await this.wingsService.createServer(
        fullServer.node,
        config,
        fullServer.egg.scriptInstall,
        fullServer.egg.scriptContainer,
      );
    } catch (error: any) {
      this.logger.error(`Failed to create server on Wings: ${error?.message}`);
      await this.serverRepo.update(saved.id, { status: ServerStatus.INSTALL_FAILED });
      throw new BadRequestException(`Failed to create server on Wings: ${error?.message}`);
    }

    return fullServer;
  }

  async update(uuid: string, dto: UpdateServerDto) {
    const server = await this.findByUuid(uuid);
    Object.assign(server, dto);
    return this.serverRepo.save(server);
  }

  async delete(uuid: string) {
    const server = await this.findByUuid(uuid);

    try {
      await this.wingsService.deleteServer(server.node, server.uuid);
    } catch (error: any) {
      this.logger.error(`Failed to delete server on Wings: ${error?.message}`);
    }

    if (server.allocation) {
      await this.allocationRepo.update(server.allocation.id, {
        serverId: null as any,
      });
    }

    await this.serverRepo.remove(server);
  }

  async power(uuid: string, action: PowerAction) {
    const server = await this.findByUuid(uuid);

    if (server.status === ServerStatus.INSTALLING) {
      throw new BadRequestException('Cannot perform power action on a server that is still installing');
    }
    if (server.status === ServerStatus.SUSPENDED) {
      throw new BadRequestException('Cannot perform power action on a suspended server');
    }

    await this.wingsService.powerAction(server.node, server.uuid, action);
  }

  async sendCommand(uuid: string, command: string) {
    const server = await this.findByUuid(uuid);
    await this.wingsService.sendCommand(server.node, server.uuid, command);
  }

  async getStats(uuid: string) {
    const server = await this.findByUuid(uuid);
    return this.wingsService.getServerStatus(server.node, server.uuid);
  }

  async suspend(id: string) {
    const server = await this.findById(id);
    if (server.status === ServerStatus.SUSPENDED) {
      throw new BadRequestException('Server is already suspended');
    }

    // Stop server if running, then suspend on Wings
    try {
      await this.wingsService.powerAction(server.node, server.uuid, PowerAction.KILL);
    } catch (error: any) {
      this.logger.warn(`Failed to stop server before suspension: ${error?.message}`);
    }

    await this.serverRepo.update(server.id, { status: ServerStatus.SUSPENDED });

    try {
      await this.wingsService.suspendServer(server.node, server.uuid);
    } catch (error: any) {
      this.logger.error(`Failed to notify Wings of suspension: ${error?.message}`);
    }

    return this.findById(id);
  }

  async unsuspend(id: string) {
    const server = await this.findById(id);
    if (server.status !== ServerStatus.SUSPENDED) {
      throw new BadRequestException('Server is not suspended');
    }

    await this.serverRepo.update(server.id, { status: null as any });

    try {
      await this.wingsService.unsuspendServer(server.node, server.uuid);
    } catch (error: any) {
      this.logger.error(`Failed to notify Wings of unsuspension: ${error?.message}`);
    }

    return this.findById(id);
  }

  async reinstall(id: string) {
    const server = await this.findById(id);

    await this.serverRepo.update(server.id, { installed: 0 });

    try {
      const config: WingsServerConfig = {
        uuid: server.uuid,
        dockerImage: server.image,
        startupCommand: server.startup,
        environment: server.envVariables || {},
        memoryLimit: server.memory,
        cpuLimit: server.cpu,
        diskLimit: server.disk,
        portMappings: [
          {
            hostPort: server.allocation.port,
            containerPort: server.allocation.port,
          },
        ],
        volumePath: `/srv/daemon-data/${server.uuid}`,
      };
      await this.wingsService.reinstallServer(
        server.node,
        config,
        server.egg.scriptInstall || '',
        server.egg.scriptContainer,
      );
    } catch (error: any) {
      this.logger.error(`Failed to reinstall server on Wings: ${error?.message}`);
      throw new BadRequestException(`Failed to reinstall server on Wings: ${error?.message}`);
    }

    return this.findById(id);
  }

  checkAccess(server: ServerEntity, userId: string, isAdmin: boolean) {
    if (isAdmin) return;
    if (server.userId !== userId) {
      throw new ForbiddenException('You do not have access to this server');
    }
  }

  async updateInstallStatus(uuid: string, status: string, message?: string) {
    const server = await this.serverRepo.findOne({ where: { uuid } });
    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (status === 'success') {
      await this.serverRepo.update(server.id, {
        installed: 1,
        status: null as any,
      });
      this.logger.log(`Server ${uuid} installation completed successfully`);
    } else {
      await this.serverRepo.update(server.id, {
        installed: 2,
        status: ServerStatus.INSTALL_FAILED,
      });
      this.logger.error(`Server ${uuid} installation failed: ${message || 'unknown error'}`);
    }

    return { success: true };
  }
}
