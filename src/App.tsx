import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { HireModalProvider, HireModalRoot } from './components/HireModal';
import { ClientProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { useSiteConfig } from './lib/siteConfig';
import Landing from './pages/Landing';
import Status from './pages/Status';
import Labs from './pages/Labs';
import Login from './pages/Login';
import ClientPortal from './pages/ClientPortal';
import Maintenance from './pages/Maintenance';
import StudioConsole from './pages/StudioConsole';

/**
 * Global maintenance gate. When the owner enables maintenance mode in the
 * Studio Console, every public route renders the Maintenance page — except
 * /studio/* so the owner can always reach the console to turn it back off.
 */
function SiteGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { config } = useSiteConfig();
  if (config.maintenanceMode && !pathname.startsWith('/studio')) {
    return <Maintenance />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <HireModalProvider>
        <BrowserRouter>
          <SiteGate>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/status" element={<Status />} />
              <Route path="/labs" element={<Labs />} />
              <Route path="/login" element={<Login />} />
              <Route path="/client/login" element={<Login />} />
              <Route
                path="/client/dashboard"
                element={
                  <ClientProtectedRoute>
                    <ClientPortal />
                  </ClientProtectedRoute>
                }
              />
              <Route
                path="/client/portal/:id"
                element={
                  <ClientProtectedRoute>
                    <ClientPortal />
                  </ClientProtectedRoute>
                }
              />
              <Route
                path="/studio/console"
                element={
                  <AdminRoute>
                    <StudioConsole />
                  </AdminRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SiteGate>
          <HireModalRoot />
        </BrowserRouter>
      </HireModalProvider>
    </AuthProvider>
  );
}
