import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../core/common/query/list-query.dto';

export class QueryEmployeesDto extends ListQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Only employees in this department',
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
