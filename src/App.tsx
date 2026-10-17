import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { HireModalProvider, HireModalRoot } from './components/HireModal';
import { ClientProtectedRoute } from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Status from './pages/Status';
import Labs from './pages/Labs';
import Login from './pages/Login';
import ClientPortal from './pages/ClientPortal';

export default function App() {
  return (
    <AuthProvider>
      <HireModalProvider>
        <BrowserRouter>
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <HireModalRoot />
        </BrowserRouter>
      </HireModalProvider>
    </AuthProvider>
  );
}
