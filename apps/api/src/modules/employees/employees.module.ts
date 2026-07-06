import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DepartmentsModule } from '../departments/departments.module';
import { UsersModule } from '../../core/users/users.module';
import { TenantsModule } from '../../core/tenants/tenants.module';
import { EmployeeCsvService } from './employee-csv.service';
import { EmployeeCustomFieldsService } from './employee-custom-fields.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EMPLOYEE_CSV_QUEUE } from './jobs/employee-csv.types';

// The CSV queue's consumer (jobs/employee-csv.processor.ts) is registered
// by WorkerModule and runs in the worker process — this module only
// produces jobs. See apps/api/src/worker.main.ts.
@Module({
  imports: [
    DepartmentsModule,
    UsersModule,
    TenantsModule,
    BullModule.registerQueue({ name: EMPLOYEE_CSV_QUEUE }),
  ],
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    EmployeeCustomFieldsService,
    EmployeeCsvService,
  ],
  exports: [EmployeesService, EmployeeCustomFieldsService],
})
export class EmployeesModule {}
