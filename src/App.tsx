import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { HireModalProvider, HireModalRoot } from './components/HireModal';
import TawkChat from './components/TawkChat';
import Measurement from './components/Measurement';
import { ClientProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { useSiteConfig } from './lib/siteConfig';
import Landing from './pages/Landing';
import Status from './pages/Status';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Labs from './pages/Labs';
import Work from './pages/Work';
import ProductDetail from './pages/ProductDetail';
import Compare from './pages/Compare';
import Notes from './pages/Notes';
import NoteDetail from './pages/NoteDetail';
import Login from './pages/Login';
import ClientPortal from './pages/ClientPortal';
import ClientDashboard from './pages/ClientDashboard';
import Maintenance from './pages/Maintenance';
import StudioConsole from './pages/StudioConsole';

/**
 * Hash-scroll restoration: links like `/#auditor` (used by the Compare
 * page and cross-page CTAs) must land on the section, not the page top.
 */
function HashScroll() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    }, 90);
    return () => clearTimeout(t);
  }, [pathname, hash]);
  return null;
}

/**
 * Global maintenance gate. When the owner enables maintenance mode in the
 * Studio Console, every public route renders the Maintenance page — except
 * /studio/* so the owner can always reach the console to turn it back off.
 */
function SiteGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { config } = useSiteConfig();
  // Maintenance never locks clients out of their own portal or the login
  // they need to reach it — the status page promises exactly that (nit 2).
  const clientPath =
    pathname === '/login' || pathname.startsWith('/client') || pathname.startsWith('/studio');
  if (config.maintenanceMode && !clientPath) {
    return <Maintenance />;
  }
  return <>{children}</>;
}

function LabsGate() {
  const { config } = useSiteConfig();
  if (config.enableLabs === false) return <Navigate to="/" replace />;
  return <Labs />;
}

export default function App() {
  return (
    <AuthProvider>
      <HireModalProvider>
        <BrowserRouter>
          <HashScroll />
          <TawkChat />
          <Measurement />
          <SiteGate>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/status" element={<Status />} />
              <Route path="/labs" element={<LabsGate />} />
              <Route path="/work" element={<Work />} />
              <Route path="/work/:slug" element={<ProductDetail />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/notes/:slug" element={<NoteDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/client/login" element={<Login />} />
              <Route
                path="/client/dashboard"
                element={
                  <ClientProtectedRoute>
                    <ClientDashboard />
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
