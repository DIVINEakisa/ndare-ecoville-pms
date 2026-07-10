/**
 * DashboardPage — role-aware entry point
 *
 * Reads the authenticated user's role from AuthContext and renders the
 * appropriate scoped sub-component. No financial data leaks to non-financial
 * roles; no operational clutter for management views.
 *
 * Role → Component mapping:
 *   Owner | Admin              → OwnerDashboard   (full financials + portfolio)
 *   Property Manager           → OwnerDashboard   (full ops, no cross-property portfolio)
 *   Receptionist | Cashier     → ReceptionistDashboard (operational + cashier variant)
 *   Kitchen Staff              → KitchenDashboard (queue + stock)
 *   Department Staff           → KitchenDashboard (stock + requisitions only)
 */
import { useAuth } from '../auth/AuthProvider';
import { KitchenDashboard } from './KitchenDashboard';
import { OwnerDashboard } from './OwnerDashboard';
import { ReceptionistDashboard } from './ReceptionistDashboard';

export function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;

  switch (role) {
    case 'Owner':
    case 'Admin':
    case 'Property Manager':
      return <OwnerDashboard role={role} />;

    case 'Receptionist':
    case 'Cashier':
      return <ReceptionistDashboard role={role} />;

    case 'Kitchen Staff':
    case 'Department Staff':
      return <KitchenDashboard role={role} />;

    default:
      // Fallback for unknown/null role — show the most restricted view
      return <KitchenDashboard role="Department Staff" />;
  }
}
