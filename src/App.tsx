import { useEffect, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { HireModalProvider, HireModalRoot } from './components/HireModal';
import TawkChat from './components/TawkChat';
import Measurement from './components/Measurement';
import PwaNudges from './components/PwaNudges';
import { ClientProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { useSiteConfig } from './lib/siteConfig';
import Landing from './pages/Landing';
import Maintenance from './pages/Maintenance';

/**
 * Route-level code splitting: every page except the homepage (Landing)
 * and the maintenance screen loads as its own chunk, only when visited.
 * The Studio Console and client portal are the heaviest parts of the app
 * and no public visitor should ever download them.
 */
const Status = lazy(() => import('./pages/Status'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Labs = lazy(() => import('./pages/Labs'));
const Work = lazy(() => import('./pages/Work'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Compare = lazy(() => import('./pages/Compare'));
const Notes = lazy(() => import('./pages/Notes'));
const NoteDetail = lazy(() => import('./pages/NoteDetail'));
const Login = lazy(() => import('./pages/Login'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const StudioConsole = lazy(() => import('./pages/StudioConsole'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const CaseStudiesPage = lazy(() => import('./pages/CaseStudiesPage'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'));
const FaqPage = lazy(() => import('./pages/FaqPage'));
const Process = lazy(() => import('./pages/Process'));
const ForAgencies = lazy(() => import('./pages/ForAgencies'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Reviews = lazy(() => import('./pages/Reviews'));

/**
 * Hash-scroll restoration: links like `/#auditor` (used by the Compare
 * page and cross-page CTAs) must land on the section, not the page top.
 */
/** Branded stand-in shown for the split second a page chunk loads. */
function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617]">
      <div className="animate-pulse font-mono text-xs uppercase tracking-[0.3em] text-emerald-300/70">
        SyncOps Studio
      </div>
    </div>
  );
}

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
 * the console path so the owner can always reach the console to turn it back off.
 */
function SiteGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { config } = useSiteConfig();
  // Maintenance never locks clients out of their own portal or the login
  // they need to reach it — the status page promises exactly that (nit 2).
  const clientPath =
    pathname === '/login' || pathname.startsWith('/client') || pathname.startsWith('/ekanto');
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
            <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/status" element={<Status />} />
              <Route path="/labs" element={<LabsGate />} />
              <Route path="/work" element={<Work />} />
              <Route path="/work/:slug" element={<ProductDetail />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/case-studies" element={<CaseStudiesPage />} />
              <Route path="/services/:lineId" element={<ServiceDetail />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/process" element={<Process />} />
              <Route path="/for-agencies" element={<ForAgencies />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/reviews" element={<Reviews />} />
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
                path="/ekanto"
                element={
                  <AdminRoute>
                    <StudioConsole />
                  </AdminRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </SiteGate>
          <HireModalRoot />
          <PwaNudges />
        </BrowserRouter>
      </HireModalProvider>
    </AuthProvider>
  );
}
