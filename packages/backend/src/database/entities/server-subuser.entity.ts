import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { ServerEntity } from './server.entity';
import { UserEntity } from './user.entity';

@Entity('server_subusers')
@Unique(['userId', 'serverId'])
export class ServerSubuserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  serverId: string;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'jsonb', default: '[]' })
  permissions: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ServerEntity, (server) => server.subusers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serverId' })
  server: ServerEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
