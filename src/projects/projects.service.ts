import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DatabaseService } from '../database/database.service';
import { Project } from './entities/project.entity';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { escapeLike } from '../common/like.util';

@Injectable()
export class ProjectsService {
  constructor(private readonly database: DatabaseService) {}

  private get repo(): Repository<Project> {
    if (!this.database.isReady) {
      throw new ServiceUnavailableException('database unavailable');
    }
    return this.database.repository(Project);
  }

  async list(q?: string, status?: string): Promise<Project[]> {
    const qb = this.repo.createQueryBuilder('project');
    if (status === 'active' || status === 'archived') {
      qb.andWhere('project.status = :status', { status });
    }
    if (q) {
      const pattern = `%${escapeLike(q)}%`;
      qb.andWhere("(project.name LIKE :q ESCAPE '\\' OR project.description LIKE :q ESCAPE '\\')", { q: pattern });
    }
    qb.orderBy('project.id', 'ASC');
    return qb.getMany();
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.repo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.tasks', 'task')
      .where('project.id = :id', { id })
      .orderBy('task.id', 'ASC')
      .getOne();
    if (!project) {
      throw new NotFoundException('project not found');
    }
    return project;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const project = this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      status: dto.status ?? 'active',
    });
    return this.repo.save(project);
  }

  async update(id: number, dto: UpdateProjectDto): Promise<Project> {
    const existing = await this.findOne(id);
    if (dto.name !== undefined) existing.name = dto.name;
    if (dto.description !== undefined) existing.description = dto.description;
    if (dto.status !== undefined) existing.status = dto.status;
    return this.repo.save(existing);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.findOne(id);
    await this.repo.delete(existing.id);
  }
}