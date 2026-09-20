import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectQueryDto } from '../tasks/dto/task.dto';
import { Project } from './entities/project.entity';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async list(@Query() query: ProjectQueryDto): Promise<{ projects: Project[] }> {
    const projects = await this.projectsService.list(query.q, query.status);
    return { projects };
  }

  @Post()
  async create(@Body() dto: CreateProjectDto): Promise<{ project: Project }> {
    const project = await this.projectsService.create(dto);
    return { project };
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: 400 })) id: number,
  ): Promise<{ project: Project }> {
    const project = await this.projectsService.findOne(id);
    return { project };
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: 400 })) id: number,
    @Body() dto: UpdateProjectDto,
  ): Promise<{ project: Project }> {
    const project = await this.projectsService.update(id, dto);
    return { project };
  }

  @Delete(':id')
  async remove(
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: 400 })) id: number,
  ): Promise<void> {
    await this.projectsService.remove(id);
  }
}