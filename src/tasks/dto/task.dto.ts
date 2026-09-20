import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

const STATUS_RE = /^(todo|in_progress|done)$/;
const PRIORITY_RE = /^(low|medium|high)$/;
const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

export class CreateTaskDto {
  @IsInt({ message: 'project_id must be an integer' })
  @Min(1, { message: 'project_id must be a positive integer' })
  @Type(() => Number)
  project_id!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'title is required' })
  @IsString({ message: 'title must be a string' })
  @MaxLength(255, { message: 'title must be at most 255 characters' })
  title!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value))
  @IsString({ message: 'description must be a string' })
  @MaxLength(2000, { message: 'description must be at most 2000 characters' })
  description?: string | null;

  @IsOptional()
  @Matches(STATUS_RE, { message: 'status must be one of: todo, in_progress, done' })
  status?: (typeof TASK_STATUSES)[number];

  @IsOptional()
  @Matches(PRIORITY_RE, { message: 'priority must be one of: low, medium, high' })
  priority?: (typeof TASK_PRIORITIES)[number];
}

export class UpdateTaskDto {
  @IsOptional()
  @IsInt({ message: 'project_id must be an integer' })
  @Min(1, { message: 'project_id must be a positive integer' })
  @Type(() => Number)
  project_id?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'title is required' })
  @IsString({ message: 'title must be a string' })
  @MaxLength(255, { message: 'title must be at most 255 characters' })
  title?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value))
  @IsString({ message: 'description must be a string' })
  @MaxLength(2000, { message: 'description must be at most 2000 characters' })
  description?: string | null;

  @IsOptional()
  @IsEnum(TASK_STATUSES, { message: 'status must be one of: todo, in_progress, done' })
  status?: (typeof TASK_STATUSES)[number];

  @IsOptional()
  @IsEnum(TASK_PRIORITIES, { message: 'priority must be one of: low, medium, high' })
  priority?: (typeof TASK_PRIORITIES)[number];
}

export class TaskQueryDto {
  @IsOptional()
  @IsString({ message: 'q must be a string' })
  q?: string;

  @IsOptional()
  @IsEnum(TASK_STATUSES, { message: 'status must be one of: todo, in_progress, done' })
  status?: (typeof TASK_STATUSES)[number];

  @IsOptional()
  @IsEnum(TASK_PRIORITIES, { message: 'priority must be one of: low, medium, high' })
  priority?: (typeof TASK_PRIORITIES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'project_id must be an integer' })
  @Min(1, { message: 'project_id must be a positive integer' })
  project_id?: number;
}

export class ProjectQueryDto {
  @IsOptional()
  @IsString({ message: 'q must be a string' })
  q?: string;

  @IsOptional()
  @IsEnum(['active', 'archived'], { message: 'status must be one of: active, archived' })
  status?: 'active' | 'archived';
}