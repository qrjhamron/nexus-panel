import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServerSubuserEntity } from '../database/entities/server-subuser.entity';
import { UserEntity } from '../database/entities/user.entity';
import { SubuserPermission } from '@nexus/shared';

@Injectable()
export class SubusersService {
  constructor(
    @InjectRepository(ServerSubuserEntity)
    private readonly subuserRepo: Repository<ServerSubuserEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async findByServer(serverId: string) {
    return this.subuserRepo.find({
      where: { serverId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async invite(
    serverId: string,
    email: string,
    permissions: SubuserPermission[],
  ) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    const existing = await this.subuserRepo.findOne({
      where: { serverId, userId: user.id },
    });
    if (existing) {
      throw new ConflictException('User is already a subuser of this server');
    }

    const subuser = this.subuserRepo.create({
      serverId,
      userId: user.id,
      permissions,
    });
    return this.subuserRepo.save(subuser);
  }

  async update(id: string, permissions: SubuserPermission[]) {
    const subuser = await this.subuserRepo.findOne({ where: { id } });
    if (!subuser) {
      throw new NotFoundException('Subuser not found');
    }
    subuser.permissions = permissions;
    return this.subuserRepo.save(subuser);
  }

  async remove(id: string) {
    const subuser = await this.subuserRepo.findOne({ where: { id } });
    if (!subuser) {
      throw new NotFoundException('Subuser not found');
    }
    await this.subuserRepo.remove(subuser);
  }
}
