import type { RouteObject } from 'react-router-dom';
import { KnowledgeBotPage } from './pages/KnowledgeBotPage';
import { moduleConfig } from './module.config';

const routes: RouteObject[] = [{ index: true, element: <KnowledgeBotPage /> }];

export { moduleConfig };
export default routes;
