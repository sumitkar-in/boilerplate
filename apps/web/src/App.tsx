import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@boilerplate/ui-common';
import { AppRoutes } from './core/routes/AppRoutes';
import { TenantProvider } from './core/TenantProvider';

export default function App() {
  return (
    <ToastProvider>
      <TenantProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TenantProvider>
    </ToastProvider>
  );
}
