import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { NodeConnectionStatus } from '@nexus/shared';
import { AllocationEntity } from './allocation.entity';
import { ServerEntity } from './server.entity';

@Entity('nodes')
export class NodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  location: string;

  @Column()
  fqdn: string;

  @Column({ type: 'varchar', default: 'https' })
  scheme: string;

  @Column({ default: false })
  behindProxy: boolean;

  @Column()
  memory: number;

  @Column({ default: 0 })
  memoryOverallocate: number;

  @Column()
  disk: number;

  @Column({ default: 0 })
  diskOverallocate: number;

  @Column({ default: 8080 })
  daemonPort: number;

  @Column()
  daemonTokenId: string;

  @Column()
  daemonToken: string;

  @Column({ default: 100 })
  uploadSize: number;

  @Column({
    type: 'enum',
    enum: NodeConnectionStatus,
    default: NodeConnectionStatus.DISCONNECTED,
  })
  connectionStatus: NodeConnectionStatus;

  @Column({ nullable: true })
  wingsVersion?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AllocationEntity, (allocation) => allocation.node)
  allocations: AllocationEntity[];

  @OneToMany(() => ServerEntity, (server) => server.node)
  servers: ServerEntity[];
}
