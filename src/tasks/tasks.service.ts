import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DatabaseService } from '../database/database.service';
import { Task } from './entities/task.entity';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { Project } from '../projects/entities/project.entity';
import { escapeLike } from '../common/like.util';

export interface TaskFilters {
  q?: string;
  status?: string;
  priority?: string;
  project_id?: number;
}

@Injectable()
export class TasksService {
  constructor(private readonly database: DatabaseService) {}

  private get repo(): Repository<Task> {
    if (!this.database.isReady) {
      throw new ServiceUnavailableException('database unavailable');
    }
    return this.database.repository(Task);
  }

  private projectExists(projectId: number): Promise<boolean> {
    return this.database.repository(Project).existsBy({ id: projectId });
  }

  async list(filters: TaskFilters): Promise<Task[]> {
    const qb = this.repo.createQueryBuilder('task');
    if (filters.project_id !== undefined) {
      qb.andWhere('task.projectId = :projectId', { projectId: filters.project_id });
    }
    if (filters.status === 'todo' || filters.status === 'in_progress' || filters.status === 'done') {
      qb.andWhere('task.status = :status', { status: filters.status });
    }
    if (filters.priority === 'low' || filters.priority === 'medium' || filters.priority === 'high') {
      qb.andWhere('task.priority = :priority', { priority: filters.priority });
    }
    if (filters.q) {
      const pattern = `%${escapeLike(filters.q)}%`;
      qb.andWhere("(task.title LIKE :q ESCAPE '\\' OR task.description LIKE :q ESCAPE '\\')", { q: pattern });
    }
    qb.orderBy('task.id', 'ASC');
    return qb.getMany();
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.repo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .where('task.id = :id', { id })
      .getOne();
    if (!task) {
      throw new NotFoundException('task not found');
    }
    return task;
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    if (!(await this.projectExists(dto.project_id))) {
      throw new BadRequestException('referenced project does not exist');
    }
    const task = this.repo.create({
      projectId: dto.project_id,
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? 'todo',
      priority: dto.priority ?? 'medium',
    });
    return this.repo.save(task);
  }

  async update(id: number, dto: UpdateTaskDto): Promise<Task> {
    const existing = await this.findOne(id);
    if (dto.project_id !== undefined) {
      if (!(await this.projectExists(dto.project_id))) {
        throw new BadRequestException('referenced project does not exist');
      }
      existing.projectId = dto.project_id;
    }
    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.description !== undefined) existing.description = dto.description;
    if (dto.status !== undefined) existing.status = dto.status;
    if (dto.priority !== undefined) existing.priority = dto.priority;
    return this.repo.save(existing);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.findOne(id);
    await this.repo.delete(existing.id);
  }
}