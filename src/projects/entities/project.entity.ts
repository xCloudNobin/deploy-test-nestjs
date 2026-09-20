import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';

export type ProjectStatus = 'active' | 'archived';

@Entity('project')
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', default: 'active' })
  status!: ProjectStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Task, (task) => task.project, { cascade: true })
  tasks?: Task[];
}

export const PROJECT_STATUSES: ProjectStatus[] = ['active', 'archived'];