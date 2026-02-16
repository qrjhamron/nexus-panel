import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../database/entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async findAll(page = 1, perPage = 25, search?: string) {
    const where = search
      ? [
          { email: Like(`%${search}%`) },
          { username: Like(`%${search}%`) },
        ]
      : undefined;

    const [data, total] = await this.userRepo.findAndCount({
      where,
      select: [
        'id',
        'email',
        'username',
        'rootAdmin',
        'usesTotp',
        'enabled',
        'avatarUrl',
        'createdAt',
        'updatedAt',
      ],
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
    const user = await this.userRepo.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'username',
        'rootAdmin',
        'usesTotp',
        'enabled',
        'avatarUrl',
        'createdAt',
        'updatedAt',
      ],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (existing) {
      throw new ConflictException('Email or username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      ...dto,
      password: hashedPassword,
    });
    const saved = await this.userRepo.save(user);
    const { password, totpSecret, backupCodes, ...result } = saved;
    return result;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (conflict) {
        throw new ConflictException('Email already in use');
      }
    }

    if (dto.username && dto.username !== user.username) {
      const conflict = await this.userRepo.findOne({
        where: { username: dto.username },
      });
      if (conflict) {
        throw new ConflictException('Username already in use');
      }
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }

    Object.assign(user, dto);
    const saved = await this.userRepo.save(user);
    const { password, totpSecret, backupCodes, ...result } = saved;
    return result;
  }

  async delete(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepo.remove(user);
  }
}
