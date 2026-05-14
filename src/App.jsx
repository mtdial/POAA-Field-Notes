import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Feed from './pages/Feed';
import EntryDetail from './pages/EntryDetail';
import PulseLog from './pages/PulseLog';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';

function ProtectedLayout({ children, requireAdmin = false }) {
  return (
    <ProtectedRoute requireAdmin={requireAdmin}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={<ProtectedLayout><Feed /></ProtectedLayout>}
          />
          <Route
            path="/entries/:id"
            element={<ProtectedLayout><EntryDetail /></ProtectedLayout>}
          />
          <Route
            path="/dashboard"
            element={<ProtectedLayout><Dashboard /></ProtectedLayout>}
          />
          <Route
            path="/pulse"
            element={<ProtectedLayout><PulseLog /></ProtectedLayout>}
          />
          <Route
            path="/admin"
            element={<ProtectedLayout requireAdmin={true}><Admin /></ProtectedLayout>}
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
