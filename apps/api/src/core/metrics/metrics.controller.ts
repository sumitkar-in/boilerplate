import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { register } from 'prom-client';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  @Public()
  @Get()
  @Header('Content-Type', register.contentType)
  @ApiOkResponse({ description: 'Prometheus metrics payload', type: String })
  getMetrics(): Promise<string> {
    return register.metrics();
  }
}
