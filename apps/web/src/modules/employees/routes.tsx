import type { RouteObject } from 'react-router-dom';
import { EmployeePage } from './pages/EmployeePage';

const routes: RouteObject[] = [{ index: true, element: <EmployeePage /> }];

export { moduleConfig } from './module.config';

export default routes;
