import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// 20 MB of CSV text — plenty for a boilerplate import while still bounding
// the request body.
const MAX_CSV_LENGTH = 20 * 1024 * 1024;

export class ImportEmployeesDto {
  @ApiProperty({ description: 'Raw CSV text. First row must be a header row.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CSV_LENGTH)
  csv!: string;
}
