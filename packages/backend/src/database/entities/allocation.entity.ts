import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { NodeEntity } from './node.entity';
import { ServerEntity } from './server.entity';

@Entity('allocations')
@Unique(['nodeId', 'ip', 'port'])
export class AllocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nodeId: string;

  @Column()
  ip: string;

  @Column({ nullable: true })
  ipAlias?: string;

  @Column()
  port: number;

  @Column({ nullable: true })
  notes?: string;

  @Column({ nullable: true })
  serverId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => NodeEntity, (node) => node.allocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nodeId' })
  node: NodeEntity;

  @OneToOne(() => ServerEntity, (server) => server.allocation, { nullable: true })
  @JoinColumn({ name: 'serverId' })
  server?: ServerEntity;
}
