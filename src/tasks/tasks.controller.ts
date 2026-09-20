import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto/task.dto';
import { Task } from './entities/task.entity';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async list(@Query() query: TaskQueryDto): Promise<{ tasks: Task[] }> {
    const tasks = await this.tasksService.list(query);
    return { tasks };
  }

  @Post()
  async create(@Body() dto: CreateTaskDto): Promise<{ task: Task }> {
    const task = await this.tasksService.create(dto);
    return { task };
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: 400 })) id: number,
  ): Promise<{ task: Task }> {
    const task = await this.tasksService.findOne(id);
    return { task };
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: 400 })) id: number,
    @Body() dto: UpdateTaskDto,
  ): Promise<{ task: Task }> {
    const task = await this.tasksService.update(id, dto);
    return { task };
  }

  @Delete(':id')
  async remove(@Param('id', new ParseIntPipe({ errorHttpStatusCode: 400 })) id: number): Promise<void> {
    await this.tasksService.remove(id);
  }
}