import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const STATUS_PATTERN = /^(active|archived)$/;

export class CreateProjectDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'name is required' })
  @IsString({ message: 'name must be a string' })
  @MaxLength(120, { message: 'name must be at most 120 characters' })
  name!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value))
  @IsString({ message: 'description must be a string' })
  @MaxLength(1000, { message: 'description must be at most 1000 characters' })
  description?: string | null;

  @IsOptional()
  @Matches(STATUS_PATTERN, { message: 'status must be one of: active, archived' })
  status?: 'active' | 'archived';
}

export class UpdateProjectDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'name is required' })
  @IsString({ message: 'name must be a string' })
  @MaxLength(120, { message: 'name must be at most 120 characters' })
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value))
  @IsString({ message: 'description must be a string' })
  @MaxLength(1000, { message: 'description must be at most 1000 characters' })
  description?: string | null;

  @IsOptional()
  @IsEnum(['active', 'archived'], { message: 'status must be one of: active, archived' })
  status?: 'active' | 'archived';
}