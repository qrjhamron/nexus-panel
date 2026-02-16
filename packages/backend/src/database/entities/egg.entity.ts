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
import { NestEntity } from './nest.entity';
import { EggVariableEntity } from './egg-variable.entity';

@Entity('eggs')
export class EggEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nestId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  author: string;

  @Column()
  dockerImage: string;

  @Column({ type: 'jsonb', default: '{}' })
  dockerImages: Record<string, string>;

  @Column({ type: 'text' })
  startup: string;

  @Column({ type: 'jsonb', nullable: true })
  configFiles?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  configStartup?: Record<string, unknown>;

  @Column({ nullable: true })
  configStop?: string;

  @Column({ type: 'jsonb', nullable: true })
  configLogs?: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  scriptInstall?: string;

  @Column({ default: 'bash' })
  scriptEntry: string;

  @Column({ default: 'alpine:latest' })
  scriptContainer: string;

  @Column({ nullable: true })
  copyScriptFrom?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => NestEntity, (nest) => nest.eggs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nestId' })
  nest: NestEntity;

  @OneToMany(() => EggVariableEntity, (v) => v.egg, { cascade: true })
  variables: EggVariableEntity[];

  @ManyToOne(() => EggEntity, { nullable: true })
  @JoinColumn({ name: 'copyScriptFrom' })
  scriptSource?: EggEntity;
}
