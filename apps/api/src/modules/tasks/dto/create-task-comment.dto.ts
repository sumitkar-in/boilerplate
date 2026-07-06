import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTaskCommentDto {
  @ApiProperty({ example: 'I can pick this up after QA.' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}
