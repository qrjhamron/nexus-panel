import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ScheduleEntity } from './schedule.entity';

export enum ScheduleTaskActionEnum {
  COMMAND = 'command',
  POWER = 'power',
  BACKUP = 'backup',
}

@Entity('schedule_tasks')
export class ScheduleTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  scheduleId: string;

  @Column({ type: 'enum', enum: ScheduleTaskActionEnum })
  action: ScheduleTaskActionEnum;

  @Column({ default: 0 })
  sequence: number;

  @Column({ type: 'text' })
  payload: string;

  @Column({ default: 0 })
  timeOffset: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ScheduleEntity, (sched) => sched.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduleId' })
  schedule: ScheduleEntity;
}
