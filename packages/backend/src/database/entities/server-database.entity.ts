import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ServerEntity } from './server.entity';
import { DatabaseHostEntity } from './database-host.entity';

@Entity('databases')
export class ServerDatabaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  serverId: string;

  @Column()
  databaseHostId: string;

  @Column()
  database: string;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ default: '%' })
  remote: string;

  @Column({ default: 0 })
  maxConnections: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ServerEntity, (server) => server.databases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serverId' })
  server: ServerEntity;

  @ManyToOne(() => DatabaseHostEntity, (host) => host.databases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'databaseHostId' })
  databaseHost: DatabaseHostEntity;
}
