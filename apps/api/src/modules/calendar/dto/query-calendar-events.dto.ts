import { IsDateString, IsOptional, IsString } from 'class-validator';

export class QueryCalendarEventsDto {
  /** ISO date — list events whose startAt >= this */
  @IsDateString()
  @IsOptional()
  from?: string;

  /** ISO date — list events whose endAt <= this */
  @IsDateString()
  @IsOptional()
  to?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
