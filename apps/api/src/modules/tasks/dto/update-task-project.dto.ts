import { PartialType } from '@nestjs/swagger';
import { CreateTaskProjectDto } from './create-task-project.dto';

export class UpdateTaskProjectDto extends PartialType(CreateTaskProjectDto) {}
