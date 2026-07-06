import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'List of user IDs to check availability for',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  userIds!: string[];

  @ApiProperty({ description: 'Start of the time window to check' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'End of the time window to check' })
  @IsDateString()
  to!: string;
}
