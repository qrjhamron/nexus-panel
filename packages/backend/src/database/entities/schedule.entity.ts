import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ServerEntity } from './server.entity';
import { ScheduleTaskEntity } from './schedule-task.entity';

@Entity('schedules')
export class ScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  serverId: string;

  @Column()
  name: string;

  @Column()
  cronDayOfWeek: string;

  @Column()
  cronDayOfMonth: string;

  @Column()
  cronMonth: string;

  @Column()
  cronHour: string;

  @Column()
  cronMinute: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isProcessing: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ServerEntity, (server) => server.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serverId' })
  server: ServerEntity;

  @OneToMany(() => ScheduleTaskEntity, (task) => task.schedule, { cascade: true })
  tasks: ScheduleTaskEntity[];
}
