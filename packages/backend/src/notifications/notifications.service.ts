import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NotificationEntity } from '../database/entities/notification.entity';
import { NotificationType } from '@nexus/shared';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifRepo: Repository<NotificationEntity>,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    resourceType?: string,
    resourceId?: string,
  ) {
    const notification = this.notifRepo.create({
      userId,
      type,
      title,
      message,
      resourceType,
      resourceId,
    });
    return this.notifRepo.save(notification);
  }

  async findByUser(userId: string, page = 1, perPage = 25) {
    const [data, total] = await this.notifRepo.findAndCount({
      where: { userId },
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

  async markAsRead(ids: string[], userId: string) {
    await this.notifRepo.update(
      { id: In(ids), userId },
      { read: true },
    );
  }

  async markAllAsRead(userId: string) {
    await this.notifRepo.update({ userId, read: false }, { read: true });
  }

  async countUnread(userId: string) {
    const count = await this.notifRepo.count({
      where: { userId, read: false },
    });
    return { count };
  }
}
