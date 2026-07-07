import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { PlaceholderPage } from '../features/shared/PlaceholderPage';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/reservations" element={<PlaceholderPage title="Reservations" />} />
            <Route path="/guests" element={<PlaceholderPage title="Guests" />} />
            <Route path="/rooms" element={<PlaceholderPage title="Rooms" />} />
            <Route path="/restaurant" element={<PlaceholderPage title="Restaurant" />} />
            <Route path="/folios" element={<PlaceholderPage title="Guest Folios" />} />
            <Route path="/inventory" element={<PlaceholderPage title="Inventory" />} />
            <Route path="/requisitions" element={<PlaceholderPage title="Requisitions" />} />
            <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
