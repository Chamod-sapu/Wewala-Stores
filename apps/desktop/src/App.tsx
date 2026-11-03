import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AdminProtectedRoute } from '@/components/AdminProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

import AdminLoginPage from '@/pages/AdminLoginPage';
import DashboardPage from '@/pages/DashboardPage';
import OrdersPage from '@/pages/OrdersPage';
import InventoryPage from '@/pages/InventoryPage';
import SalesPage from '@/pages/SalesPage';
import ReviewsPage from '@/pages/ReviewsPage';
import UsersPage from '@/pages/UsersPage';

export default function App() {
  return (
    <AdminAuthProvider>
      <NotificationProvider>
        <ErrorBoundary>
          <HashRouter>
            <Routes>
            {/* Public / Unauthenticated Admin Login Route */}
            <Route path="/login" element={<AdminLoginPage />} />

            {/* Protected Admin Console Routes with App Shell */}
            <Route
              path="/"
              element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="users" element={<UsersPage />} />
            </Route>

            {/* Fallback to root */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
        </ErrorBoundary>
      </NotificationProvider>
    </AdminAuthProvider>
  );
}
