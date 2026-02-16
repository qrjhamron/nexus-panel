import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { NodeEntity } from '../../database/entities/node.entity';

@Injectable()
export class DaemonTokenGuard implements CanActivate {
  constructor(
    @InjectRepository(NodeEntity)
    private readonly nodeRepo: Repository<NodeEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing daemon token');
    }

    const bearerToken = authHeader.slice(7);
    const dotIndex = bearerToken.indexOf('.');
    if (dotIndex === -1) {
      throw new UnauthorizedException('Invalid daemon token format');
    }

    const tokenId = bearerToken.slice(0, dotIndex);
    const token = bearerToken.slice(dotIndex + 1);

    const node = await this.nodeRepo.findOne({
      where: { daemonTokenId: tokenId },
    });
    if (!node) {
      throw new UnauthorizedException('Invalid daemon token');
    }

    if (token !== node.daemonToken) {
      throw new UnauthorizedException('Invalid daemon token');
    }

    request.node = node;
    return true;
  }
}
