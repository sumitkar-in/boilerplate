import type { RouteObject } from 'react-router-dom';
import { BpqlPage } from './pages/BpqlPage';

const routes: RouteObject[] = [{ index: true, element: <BpqlPage /> }];

export { moduleConfig } from './module.config';

export default routes;
