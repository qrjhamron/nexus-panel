import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EggEntity } from './egg.entity';

@Entity('egg_variables')
export class EggVariableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eggId: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  envVariable: string;

  @Column({ default: '' })
  defaultValue: string;

  @Column({ default: true })
  userViewable: boolean;

  @Column({ default: true })
  userEditable: boolean;

  @Column({ default: '' })
  rules: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => EggEntity, (egg) => egg.variables, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eggId' })
  egg: EggEntity;
}
