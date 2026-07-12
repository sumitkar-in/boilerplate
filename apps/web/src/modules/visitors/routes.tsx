import type { RouteObject } from 'react-router-dom';
import { VisitorPage } from './pages/VisitorPage';

const routes: RouteObject[] = [{ index: true, element: <VisitorPage /> }];

export { moduleConfig } from './module.config';

export default routes;
