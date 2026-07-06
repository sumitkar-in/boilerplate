import type { RouteObject } from 'react-router-dom';
import { DepartmentPage } from './pages/DepartmentPage';

const routes: RouteObject[] = [{ index: true, element: <DepartmentPage /> }];

export { moduleConfig } from './module.config';

export default routes;
