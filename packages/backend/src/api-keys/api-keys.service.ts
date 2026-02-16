import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKeyEntity } from '../database/entities/api-key.entity';
import { CreateApiKeyDto } from './dto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepo: Repository<ApiKeyEntity>,
  ) {}

  async findByUser(userId: string) {
    return this.apiKeyRepo.find({
      where: { userId },
      select: [
        'id',
        'memo',
        'keyStart',
        'allowedIps',
        'lastUsedAt',
        'createdAt',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async create(userId: string, dto: CreateApiKeyDto) {
    const plainToken = `ptlc_${crypto.randomBytes(24).toString('hex').substring(0, 43)}`;
    const keyStart = plainToken.substring(0, 16);
    const token = await bcrypt.hash(plainToken, 10);

    const apiKey = this.apiKeyRepo.create({
      userId,
      memo: dto.memo,
      token,
      keyStart,
      allowedIps: dto.allowedIps ?? [],
    });
    const saved = await this.apiKeyRepo.save(apiKey);

    return {
      apiKey: {
        id: saved.id,
        memo: saved.memo,
        keyStart: saved.keyStart,
      },
      plainTextToken: plainToken,
    };
  }

  async findByKeyStart(keyStart: string): Promise<ApiKeyEntity | null> {
    return this.apiKeyRepo.findOne({
      where: { keyStart },
      relations: ['user'],
    });
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.apiKeyRepo.update(id, { lastUsedAt: new Date() });
  }

  async delete(id: string, userId: string) {
    const apiKey = await this.apiKeyRepo.findOne({
      where: { id, userId },
    });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }
    await this.apiKeyRepo.remove(apiKey);
  }
}
