import { PartialType } from '@nestjs/swagger';
import { CreateTaskCustomFieldDto } from './create-task-custom-field.dto';

export class UpdateTaskCustomFieldDto extends PartialType(
  CreateTaskCustomFieldDto,
) {}
