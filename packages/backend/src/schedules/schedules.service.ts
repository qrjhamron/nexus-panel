import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleEntity } from '../database/entities/schedule.entity';
import { ScheduleTaskEntity } from '../database/entities/schedule-task.entity';
import { CreateScheduleDto, UpdateScheduleDto } from './dto';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(ScheduleEntity)
    private readonly scheduleRepo: Repository<ScheduleEntity>,
    @InjectRepository(ScheduleTaskEntity)
    private readonly taskRepo: Repository<ScheduleTaskEntity>,
  ) {}

  async findByServer(serverId: string) {
    return this.scheduleRepo.find({
      where: { serverId },
      relations: ['tasks'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string) {
    const schedule = await this.scheduleRepo.findOne({
      where: { id },
      relations: ['tasks'],
    });
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }
    return schedule;
  }

  async create(serverId: string, dto: CreateScheduleDto) {
    const schedule = this.scheduleRepo.create({
      serverId,
      name: dto.name,
      cronMinute: dto.cronMinute,
      cronHour: dto.cronHour,
      cronDayOfMonth: dto.cronDayOfMonth,
      cronMonth: dto.cronMonth,
      cronDayOfWeek: dto.cronDayOfWeek,
      isActive: dto.isActive,
      tasks: dto.tasks.map((t) =>
        this.taskRepo.create({
          sequence: t.sequence,
          action: t.action,
          payload: t.payload,
          timeOffset: t.timeOffset ?? 0,
        }),
      ),
    });
    return this.scheduleRepo.save(schedule);
  }

  async update(id: string, dto: UpdateScheduleDto) {
    const schedule = await this.findById(id);

    if (dto.name !== undefined) schedule.name = dto.name;
    if (dto.cronMinute !== undefined) schedule.cronMinute = dto.cronMinute;
    if (dto.cronHour !== undefined) schedule.cronHour = dto.cronHour;
    if (dto.cronDayOfMonth !== undefined) schedule.cronDayOfMonth = dto.cronDayOfMonth;
    if (dto.cronMonth !== undefined) schedule.cronMonth = dto.cronMonth;
    if (dto.cronDayOfWeek !== undefined) schedule.cronDayOfWeek = dto.cronDayOfWeek;
    if (dto.isActive !== undefined) schedule.isActive = dto.isActive;

    if (dto.tasks) {
      // Remove old tasks and replace
      await this.taskRepo.delete({ scheduleId: id });
      schedule.tasks = dto.tasks.map((t) =>
        this.taskRepo.create({
          scheduleId: id,
          sequence: t.sequence,
          action: t.action,
          payload: t.payload,
          timeOffset: t.timeOffset ?? 0,
        }),
      );
    }

    return this.scheduleRepo.save(schedule);
  }

  async delete(id: string) {
    const schedule = await this.findById(id);
    await this.scheduleRepo.remove(schedule);
  }

  async executeSchedule(id: string) {
    const schedule = await this.findById(id);
    this.logger.log(`Executing schedule '${schedule.name}' (${id})`);

    schedule.lastRunAt = new Date();
    await this.scheduleRepo.save(schedule);

    return { message: `Schedule '${schedule.name}' execution triggered` };
  }
}
