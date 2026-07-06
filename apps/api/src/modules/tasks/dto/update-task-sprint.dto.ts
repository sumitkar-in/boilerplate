import { PartialType } from '@nestjs/swagger';
import { CreateTaskSprintDto } from './create-task-sprint.dto';

export class UpdateTaskSprintDto extends PartialType(CreateTaskSprintDto) {}
