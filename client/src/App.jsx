import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import PublicLayout from './components/PublicLayout';
import { useAuth } from './hooks/useAuth';
import Home from './pages/public/Home';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Messages from './pages/Messages';
import Inbox from './pages/Inbox';
import Templates from './pages/Templates';
import Broadcast from './pages/Broadcast';
import Analytics from './pages/Analytics';
import Costs from './pages/Costs';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import AdminOverview from './pages/admin/AdminOverview';
import AdminClients from './pages/admin/AdminClients';
import AdminBilling from './pages/admin/AdminBilling';
import AdminPricing from './pages/admin/AdminPricing';

// Admin-only area. Non-admins (incl. an admin who is impersonating a customer) fall back to the app.
function AdminArea() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return (
    <AdminLayout>
      <Routes>
        <Route index            element={<AdminOverview />} />
        <Route path="clients"   element={<AdminClients />} />
        <Route path="billing"   element={<AdminBilling />} />
        <Route path="pricing"   element={<AdminPricing />} />
        <Route path="*"         element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}

// Public landing at "/". Logged-in users are sent to their app; guests see the marketing home.
function RootGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <PublicLayout><Home /></PublicLayout>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#25D366', secondary: '#fff' } },
            }}
          />
          <Routes>
            {/* Public marketing site */}
            <Route path="/"        element={<RootGate />} />
            <Route path="/about"   element={<PublicLayout><About /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
            <Route path="/login"   element={<Login />} />

            {/* Admin */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminArea />
                </ProtectedRoute>
              }
            />

            {/* Authenticated customer app */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="dashboard"  element={<Dashboard />} />
                      <Route path="contacts"   element={<Contacts />} />
                      <Route path="messages"   element={<Messages />} />
                      <Route path="inbox"      element={<Inbox />} />
                      <Route path="templates"  element={<Templates />} />
                      <Route path="broadcast"  element={<Broadcast />} />
                      <Route path="analytics"  element={<Analytics />} />
                      <Route path="costs"      element={<Costs />} />
                      <Route path="billing"    element={<Billing />} />
                      <Route path="settings"   element={<Settings />} />
                      <Route path="*"          element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
