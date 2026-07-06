import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  TASK_SPRINT_STATUSES,
  type TaskSprintStatus,
} from '../entities/task-sprint';

export class CreateTaskSprintDto {
  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiProperty({ example: 'Sprint 24.7' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ enum: TASK_SPRINT_STATUSES, default: 'planned' })
  @IsOptional()
  @IsIn(TASK_SPRINT_STATUSES)
  status?: TaskSprintStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string | null;
}
