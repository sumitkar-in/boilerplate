import { PartialType } from '@nestjs/swagger';
import { CreateBpqlSavedQueryDto } from './create-bpql-saved-query.dto';

export class UpdateBpqlSavedQueryDto extends PartialType(
  CreateBpqlSavedQueryDto,
) {}
