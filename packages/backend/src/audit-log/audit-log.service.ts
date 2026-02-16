import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../database/entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  async log(params: {
    userId: string;
    event: string;
    ip: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const entry = this.auditRepo.create({
      userId: params.userId,
      event: params.event,
      ip: params.ip,
      metadata: params.metadata || {},
    });
    await this.auditRepo.save(entry);
  }

  async findAll(
    page = 1,
    perPage = 25,
    event?: string,
    userId?: string,
  ) {
    const qb = this.auditRepo
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user');

    if (event) {
      qb.andWhere('audit.event = :event', { event });
    }
    if (userId) {
      qb.andWhere('audit.userId = :userId', { userId });
    }

    qb.orderBy('audit.createdAt', 'DESC')
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
}
