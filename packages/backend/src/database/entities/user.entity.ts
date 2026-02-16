import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ServerEntity } from './server.entity';
import { SessionEntity } from './session.entity';
import { ApiKeyEntity } from './api-key.entity';
import { NotificationEntity } from './notification.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ default: false })
  rootAdmin: boolean;

  @Column({ default: false })
  usesTotp: boolean;

  @Column({ nullable: true })
  totpSecret?: string;

  @Column({ nullable: true })
  pendingTotpSecret?: string;

  @Column('jsonb', { nullable: true })
  backupCodes?: string[];

  @Column({ default: true })
  enabled: boolean;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ServerEntity, (server) => server.user)
  servers: ServerEntity[];

  @OneToMany(() => SessionEntity, (session) => session.user)
  sessions: SessionEntity[];

  @OneToMany(() => ApiKeyEntity, (key) => key.user)
  apiKeys: ApiKeyEntity[];

  @OneToMany(() => NotificationEntity, (n) => n.user)
  notifications: NotificationEntity[];
}
