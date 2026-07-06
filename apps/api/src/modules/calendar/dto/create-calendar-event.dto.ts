import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EVENT_STATUS,
  EVENT_TYPES,
  EVENT_VISIBILITY,
  type EventStatus,
  type EventType,
  type EventVisibility,
} from '../entities/calendar-event';

class AttendeeInputDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsString()
  @MaxLength(255)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}

export class CreateCalendarEventDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EVENT_TYPES)
  @IsOptional()
  type?: EventType;

  @IsEnum(EVENT_STATUS)
  @IsOptional()
  status?: EventStatus;

  @IsEnum(EVENT_VISIBILITY)
  @IsOptional()
  visibility?: EventVisibility;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsString()
  @MaxLength(512)
  @IsOptional()
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  meetingLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  rrule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AttendeeInputDto)
  attendees?: AttendeeInputDto[];
}
