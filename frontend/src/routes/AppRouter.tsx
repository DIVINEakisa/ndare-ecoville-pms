import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Skeleton } from '../components/ui/Skeleton';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { GuestPortalLayout } from '../layouts/GuestPortalLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { PlaceholderPage } from '../features/shared/PlaceholderPage';
import { ProtectedRoute } from './ProtectedRoute';
import { OwnerRoute } from './OwnerRoute';

const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage }))
);
const ReservationsPage = lazy(() =>
  import('../features/operations/ReservationsPage').then((module) => ({ default: module.ReservationsPage }))
);
const GuestsPage = lazy(() => import('../features/operations/GuestsPage').then((module) => ({ default: module.GuestsPage })));
const RoomsPage = lazy(() => import('../features/operations/RoomsPage').then((module) => ({ default: module.RoomsPage })));
const CheckInPage = lazy(() =>
  import('../features/operations/CheckInPage').then((module) => ({ default: module.CheckInPage }))
);
const CheckOutPage = lazy(() =>
  import('../features/operations/CheckOutPage').then((module) => ({ default: module.CheckOutPage }))
);
const FoliosPage = lazy(() =>
  import('../features/folios/FoliosPage').then((module) => ({ default: module.FoliosPage }))
);
const RestaurantPage = lazy(() =>
  import('../features/restaurant/RestaurantPage').then((module) => ({ default: module.RestaurantPage }))
);
const HousekeepingPage = lazy(() =>
  import('../features/operations/HousekeepingPage').then((module) => ({ default: module.HousekeepingPage }))
);
const KitchenQueuePage = lazy(() =>
  import('../features/restaurant/KitchenQueuePage').then((module) => ({ default: module.KitchenQueuePage }))
);
const GuestPortalPage = lazy(() =>
  import('../features/guest-portal/GuestPortalPage').then((module) => ({ default: module.GuestPortalPage }))
);
const InventoryPage = lazy(() =>
  import('../features/supply/InventoryPage').then((module) => ({ default: module.InventoryPage }))
);
const RequisitionsPage = lazy(() =>
  import('../features/supply/RequisitionsPage').then((module) => ({ default: module.RequisitionsPage }))
);
const NotificationsPage = lazy(() =>
  import('../features/supply/NotificationsPage').then((module) => ({ default: module.NotificationsPage }))
);
const HistoryPage = lazy(() =>
  import('../features/admin/HistoryPage').then((module) => ({ default: module.HistoryPage }))
);
const ReportsPage = lazy(() =>
  import('../features/admin/ReportsPage').then((module) => ({ default: module.ReportsPage }))
);
const SettingsPage = lazy(() =>
  import('../features/admin/SettingsPage').then((module) => ({ default: module.SettingsPage }))
);
const QRManagementPage = lazy(() =>
  import('../features/admin/QRManagementPage').then((module) => ({ default: module.QRManagementPage }))
);
const UsersPage = lazy(() =>
  import('../features/users/UsersPage').then((module) => ({ default: module.UsersPage }))
);
const LandingPage = lazy(() =>
  import('../features/marketing/LandingPage').then((module) => ({ default: module.LandingPage }))
);
const ResetPasswordPage = lazy(() =>
  import('../features/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('../features/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage }))
);
const PublicOrderPage = lazy(() =>
  import('../features/public-order/PublicOrderPage').then((module) => ({ default: module.PublicOrderPage }))
);

function RouteFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/order/:propertyId" element={<PublicOrderPage />} />
          <Route element={<GuestPortalLayout />}>
            <Route path="/guest-portal/:propertyId/:roomId" element={<GuestPortalPage />} />
            <Route path="/guest-portal/demo" element={<GuestPortalPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/reservations" element={<ReservationsPage />} />
              <Route path="/guests" element={<GuestsPage />} />
              <Route path="/rooms" element={<RoomsPage />} />
              <Route path="/check-in" element={<CheckInPage />} />
              <Route path="/check-out" element={<CheckOutPage />} />
              <Route path="/restaurant" element={<RestaurantPage />} />
              <Route path="/kitchen" element={<KitchenQueuePage />} />
              <Route path="/housekeeping" element={<HousekeepingPage />} />
              <Route path="/folios" element={<FoliosPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/requisitions" element={<RequisitionsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/qr-management" element={<QRManagementPage />} />
              <Route element={<OwnerRoute />}>
                <Route path="/dashboard/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
