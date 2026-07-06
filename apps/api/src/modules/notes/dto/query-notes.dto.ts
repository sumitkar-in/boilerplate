import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ListQueryDto } from '../../../core/common/query/list-query.dto';
import { NOTE_STATUSES, type NoteStatus } from '../entities/note';

export class QueryNotesDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: NOTE_STATUSES })
  @IsOptional()
  @IsIn(NOTE_STATUSES)
  status?: NoteStatus;

  @ApiPropertyOptional({ description: 'Only notes tagged with this label' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  pinned?: boolean;
}
