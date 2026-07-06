import { PartialType } from '@nestjs/swagger';
import { CreateBpqlChartDto } from './create-bpql-chart.dto';

export class UpdateBpqlChartDto extends PartialType(CreateBpqlChartDto) {}
