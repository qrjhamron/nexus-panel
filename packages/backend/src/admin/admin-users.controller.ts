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
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { ServerEntity } from '../database/entities/server.entity';
import { ApiKeyEntity } from '../database/entities/api-key.entity';
import { CreateUserDto, UpdateUserDto } from '../users/dto';

@ApiTags('admin/users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ServerEntity)
    private readonly serverRepo: Repository<ServerEntity>,
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepo: Repository<ApiKeyEntity>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all users (paginated, searchable)' })
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
      skip: (p - 1) * pp,
      take: pp,
    });

    return {
      data,
      meta: { total, page: p, perPage: pp, totalPages: Math.ceil(total / pp) },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user detail with servers and API keys' })
  async findById(@Param('id') id: string) {
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
      throw new BadRequestException('User not found');
    }

    const servers = await this.serverRepo.find({
      where: { userId: id },
      select: ['id', 'name', 'status', 'createdAt'],
    });

    const apiKeys = await this.apiKeyRepo.find({
      where: { userId: id },
      select: ['id', 'keyStart', 'memo', 'lastUsedAt', 'createdAt'],
    });

    return { ...user, servers, apiKeys };
  }

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  async create(@Body() dto: CreateUserDto) {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (existing) {
      throw new BadRequestException('Email or username already exists');
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

  @Put(':id')
  @ApiOperation({ summary: 'Update a user (including force password change)' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.userRepo.findOne({ where: { email: dto.email } });
      if (conflict) {
        throw new BadRequestException('Email already in use');
      }
    }

    if (dto.username && dto.username !== user.username) {
      const conflict = await this.userRepo.findOne({ where: { username: dto.username } });
      if (conflict) {
        throw new BadRequestException('Username already in use');
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (reject if owns servers)' })
  async delete(@Param('id') id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const serverCount = await this.serverRepo.count({ where: { userId: id } });
    if (serverCount > 0) {
      throw new BadRequestException(
        `Cannot delete user: ${serverCount} server(s) are still owned by this user`,
      );
    }

    await this.userRepo.remove(user);
  }
}
