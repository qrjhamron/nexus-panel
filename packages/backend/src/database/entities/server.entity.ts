import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Generated,
  BeforeInsert,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { NodeEntity } from './node.entity';
import { EggEntity } from './egg.entity';
import { AllocationEntity } from './allocation.entity';
import { ServerDatabaseEntity } from './server-database.entity';
import { ScheduleEntity } from './schedule.entity';
import { ServerSubuserEntity } from './server-subuser.entity';

export enum ServerStatus {
  INSTALLING = 'installing',
  INSTALL_FAILED = 'install_failed',
  SUSPENDED = 'suspended',
  RESTORING_BACKUP = 'restoring_backup',
  TRANSFERRING = 'transferring',
}

@Entity('servers')
export class ServerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  externalId?: string;

  @Column()
  @Generated('uuid')
  uuid: string;

  @Column({ unique: true, length: 8 })
  uuidShort: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column()
  userId: string;

  @Column()
  nodeId: string;

  @Column()
  nestId: string;

  @Column()
  eggId: string;

  @Column({ unique: true })
  allocationId: string;

  @Column()
  memory: number;

  @Column({ default: 0 })
  swap: number;

  @Column()
  disk: number;

  @Column({ default: 500 })
  io: number;

  @Column({ default: 100 })
  cpu: number;

  @Column({ nullable: true })
  threads?: string;

  @Column({ default: false })
  oomDisabled: boolean;

  @Column({ type: 'text' })
  startup: string;

  @Column()
  image: string;

  @Column({ type: 'jsonb', default: '{}' })
  envVariables: Record<string, string>;

  @Column({ default: 0 })
  installed: number;

  @Column({ type: 'enum', enum: ServerStatus, nullable: true })
  status?: ServerStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateUuidShort() {
    if (!this.uuidShort) {
      // Generate a random 8-char hex string since uuid may not be set yet
      if (this.uuid) {
        this.uuidShort = this.uuid.replace(/-/g, '').substring(0, 8);
      } else {
        this.uuidShort = require('crypto').randomBytes(4).toString('hex');
      }
    }
  }

  @ManyToOne(() => UserEntity, (user) => user.servers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => NodeEntity, (node) => node.servers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nodeId' })
  node: NodeEntity;

  @ManyToOne(() => EggEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'eggId' })
  egg: EggEntity;

  @OneToOne(() => AllocationEntity, (alloc) => alloc.server)
  allocation: AllocationEntity;

  @OneToMany(() => ServerDatabaseEntity, (db) => db.server)
  databases: ServerDatabaseEntity[];

  @OneToMany(() => ScheduleEntity, (sched) => sched.server)
  schedules: ScheduleEntity[];

  @OneToMany(() => ServerSubuserEntity, (su) => su.server)
  subusers: ServerSubuserEntity[];
}
