import {
  Body,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentTenant } from '../../core/common/decorators/current-tenant.decorator';
import { Permissions } from '../../core/common/decorators/permissions.decorator';
import { TenantModuleController } from '../../core/common/decorators/tenant-module-controller.decorator';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { QueryCalendarEventsDto } from './dto/query-calendar-events.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
@TenantModuleController('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @Permissions('modules:read')
  @ApiOkResponse({ description: 'List calendar events for the current user.' })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: QueryCalendarEventsDto,
  ) {
    return this.calendarService.listEvents(tenant, query);
  }

  @Get('export.ics')
  @Permissions('modules:read')
  @ApiOkResponse({ description: 'Export user events as ICS file.' })
  async exportIcs(
    @CurrentTenant() tenant: TenantContext,
    @Res() res: Response,
  ) {
    const ics = await this.calendarService.exportIcs(tenant);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
    res.send(ics);
  }

  @Post('import')
  @Permissions('modules:create')
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ description: 'Import events from an ICS file.' })
  @UseInterceptors(FileInterceptor('file'))
  importIcs(
    @CurrentTenant() tenant: TenantContext,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const icsContent = file.buffer.toString('utf-8');
    return this.calendarService.importIcs(tenant, icsContent);
  }

  @Get(':id')
  @Permissions('modules:read')
  findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.calendarService.findOne(tenant, id);
  }

  @Post('availability')
  @Permissions('modules:read')
  @ApiOkResponse({ description: 'Check availability for a list of users.' })
  checkAvailability(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CheckAvailabilityDto,
  ) {
    return this.calendarService.checkAvailability(tenant, dto);
  }

  @Post()
  @Permissions('modules:create')
  @ApiCreatedResponse({ description: 'Create a calendar event.' })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateCalendarEventDto,
  ) {
    return this.calendarService.create(tenant, dto);
  }

  @Patch(':id')
  @Permissions('modules:update')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.calendarService.update(tenant, id, dto);
  }

  @Delete(':id')
  @Permissions('modules:delete')
  remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.calendarService.remove(tenant, id);
  }
}
