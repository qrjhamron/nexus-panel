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
import { NodeEntity } from './node.entity';
import { ServerDatabaseEntity } from './server-database.entity';

@Entity('database_hosts')
export class DatabaseHostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  host: string;

  @Column()
  port: number;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  maxDatabases?: number;

  @Column({ nullable: true })
  nodeId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => NodeEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nodeId' })
  node?: NodeEntity;

  @OneToMany(() => ServerDatabaseEntity, (db) => db.databaseHost)
  databases: ServerDatabaseEntity[];
}
