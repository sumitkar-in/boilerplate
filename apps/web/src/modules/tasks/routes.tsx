import type { RouteObject } from 'react-router-dom';
import { TasksPage } from './pages/TasksPage';
import { moduleConfig } from './module.config';

const routes: RouteObject[] = [{ index: true, element: <TasksPage /> }];

export { moduleConfig };
export default routes;
