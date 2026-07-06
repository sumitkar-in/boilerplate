import { PartialType } from '@nestjs/swagger';
import { CreateBpqlTableDto } from './create-bpql-table.dto';

export class UpdateBpqlTableDto extends PartialType(CreateBpqlTableDto) {}
