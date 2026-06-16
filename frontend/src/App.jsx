import { useEffect } from 'react';
function App() {
  useEffect(() => {
    // Keep Railway backend alive
    const ping = () => fetch(`${import.meta.env.VITE_API_URL}/api/health`).catch(() => {});
    ping(); // ping immediately on load
    const interval = setInterval(ping, 5 * 60 * 1000); // then every 5 mins
    return () => clearInterval(interval);
  }, []);
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import VerifyEmail from './pages/VerifyEmail';

function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={
              <AuthGuard><AuthPage /></AuthGuard>
            } />
            <Route path="/" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

}