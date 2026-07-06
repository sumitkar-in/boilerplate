import { QueryEmployeesDto } from './query-employees.dto';

// Same narrowing options as the list endpoint; limit/offset are ignored —
// the worker streams every matching row into the file.
export class ExportEmployeesDto extends QueryEmployeesDto {}
