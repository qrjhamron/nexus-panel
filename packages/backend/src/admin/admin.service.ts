import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ServerEntity } from '../database/entities/server.entity';
import { UserEntity } from '../database/entities/user.entity';
import { NodeEntity } from '../database/entities/node.entity';
import { ServerPowerState } from '@nexus/shared';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(ServerEntity)
    private readonly serverRepo: Repository<ServerEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(NodeEntity)
    private readonly nodeRepo: Repository<NodeEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async getDashboardStats() {
    const totalUsers = await this.userRepo.count();
    const totalServers = await this.serverRepo.count();
    const totalNodes = await this.nodeRepo.count();

    const serversByStateRaw = await this.serverRepo
      .createQueryBuilder('server')
      .select('server.powerState', 'state')
      .addSelect('COUNT(*)', 'count')
      .groupBy('server.powerState')
      .getRawMany();

    const serversByState: Record<string, number> = {};
    for (const row of serversByStateRaw) {
      serversByState[row.state] = parseInt(row.count, 10);
    }

    const nodes = await this.nodeRepo.find({
      select: [
        'id',
        'name',
        'connectionStatus',
        'memory',
        'disk',
      ],
    });

    return {
      totalUsers,
      totalServers,
      totalNodes,
      serversByState,
      nodes: nodes.map((n) => ({
        id: n.id,
        name: n.name,
        status: n.connectionStatus,
        memoryUsed: 0,
        memoryTotal: n.memory,
        diskUsed: 0,
        diskTotal: n.disk,
      })),
    };
  }

  async impersonateUser(adminId: string, targetUserId: string) {
    const target = await this.userRepo.findOne({
      where: { id: targetUserId },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    this.logger.warn(
      `Admin ${adminId} is impersonating user ${targetUserId}`,
    );

    const payload = {
      sub: target.id,
      email: target.email,
      rootAdmin: target.rootAdmin,
      impersonatedBy: adminId,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

    return {
      accessToken,
      user: {
        id: target.id,
        email: target.email,
        username: target.username,
        rootAdmin: target.rootAdmin,
      },
    };
  }
}
