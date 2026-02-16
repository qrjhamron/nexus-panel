import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { NodeEntity } from '../database/entities/node.entity';
import { ServerEntity } from '../database/entities/server.entity';
import { CreateNodeDto, UpdateNodeDto } from '../nodes/dto';
import { NodesService } from '../nodes/nodes.service';
import { NodeHeartbeatStore } from '../nodes/node-heartbeat.store';

@ApiTags('admin/nodes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/nodes')
export class AdminNodesController {
  constructor(
    @InjectRepository(NodeEntity)
    private readonly nodeRepo: Repository<NodeEntity>,
    @InjectRepository(ServerEntity)
    private readonly serverRepo: Repository<ServerEntity>,
    private readonly nodesService: NodesService,
    private readonly heartbeatStore: NodeHeartbeatStore,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all nodes with details' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('search') search?: string,
  ) {
    const p = page ? +page : 1;
    const pp = perPage ? +perPage : 25;
    const where = search ? { name: Like(`%${search}%`) } : undefined;

    const [nodes, total] = await this.nodeRepo.findAndCount({
      where,
      relations: ['locationEntity'],
      order: { createdAt: 'DESC' },
      skip: (p - 1) * pp,
      take: pp,
    });

    const data = await Promise.all(
      nodes.map(async (node) => {
        const serverCount = await this.serverRepo.count({ where: { nodeId: node.id } });
        const allocCount = node.allocations ? node.allocations.length : 0;
        const online = this.heartbeatStore.isOnline(node.id);
        const heartbeat = this.heartbeatStore.get(node.id);
        return {
          ...node,
          serverCount,
          allocationCount: allocCount,
          online,
          memoryUsed: heartbeat?.usedMemory ?? null,
          memoryTotal: heartbeat?.totalMemory ?? null,
          diskUsed: heartbeat?.usedDisk ?? null,
          diskTotal: heartbeat?.totalDisk ?? null,
          cpuUsage: heartbeat?.cpuPercent ?? null,
          lastHeartbeat: heartbeat?.receivedAt ?? null,
        };
      }),
    );

    return {
      data,
      meta: { total, page: p, perPage: pp, totalPages: Math.ceil(total / pp) },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full node detail' })
  async findById(@Param('id') id: string) {
    const node = await this.nodeRepo.findOne({
      where: { id },
      relations: ['allocations', 'servers', 'locationEntity'],
    });
    if (!node) {
      throw new BadRequestException('Node not found');
    }
    const online = this.heartbeatStore.isOnline(node.id);
    const heartbeat = this.heartbeatStore.get(node.id);
    return { ...node, online, lastHeartbeat: heartbeat || null };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new node' })
  async create(@Body() dto: CreateNodeDto) {
    return this.nodesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a node' })
  async update(@Param('id') id: string, @Body() dto: UpdateNodeDto) {
    return this.nodesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a node (reject if servers assigned)' })
  async delete(@Param('id') id: string) {
    const serverCount = await this.serverRepo.count({ where: { nodeId: id } });
    if (serverCount > 0) {
      throw new BadRequestException(
        `Cannot delete node: ${serverCount} server(s) are still assigned to it`,
      );
    }
    return this.nodesService.delete(id);
  }
}
