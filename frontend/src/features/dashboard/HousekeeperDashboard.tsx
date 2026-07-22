/**
 * HousekeeperDashboard — visible to: Housekeeper role
 *
 * Provides a focused view of room statuses — how many rooms need
 * cleaning, are under maintenance, or are ready. No financial data
 * is exposed to this role.
 */
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, BedDouble, CheckCircle, Clock, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../auth/AuthProvider';
import { useProperty } from '../../contexts/PropertyContext';
import { listRoomsForHousekeeping } from '../housekeeping/housekeepingApi';

export function HousekeeperDashboard() {
  const { user } = useAuth();
  const { activePropertyId: contextPropertyId } = useProperty();

  // Prefer the global property selector (PropertyContext / sessionStorage) so
  // the dashboard respects the same property the user has selected in the nav.
  // Fall back to the value stored on the user record if the selector is empty.
  const propertyId =
    contextPropertyId ||
    user?.activePropertyId ||
    (user?.assignedPropertyIds?.[0] as string | undefined);

  const roomsQuery = useQuery({
    queryKey: ['housekeeping-rooms', propertyId, ''],
    queryFn: () => listRoomsForHousekeeping({ propertyId, limit: 100 }),
    enabled: Boolean(propertyId),
    refetchInterval: 30_000
  });

  if (roomsQuery.isLoading) {
    return (
      <div>
        <PageHeader title="Housekeeping Workspace" breadcrumb={['Workspace', 'Dashboard']} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  if (roomsQuery.isError) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        message="Could not load room data right now."
      />
    );
  }

  const rooms = roomsQuery.data?.items ?? [];
  const available   = rooms.filter((r) => r.status === 'Available').length;
  const occupied    = rooms.filter((r) => r.status === 'Occupied').length;
  const maintenance = rooms.filter((r) => r.status === 'Maintenance').length;
  const reserved    = rooms.filter((r) => r.status === 'Reserved').length;
  const total       = rooms.length;

  return (
    <div>
      <PageHeader title="Housekeeping Workspace" breadcrumb={['Workspace', 'Dashboard']} />

      {/* ── Room status metrics ── */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Available Rooms"
          value={available}
          helper={`${total} total rooms`}
          icon={CheckCircle}
          tone="lime"
        />
        <MetricCard
          title="Occupied Rooms"
          value={occupied}
          helper="Currently hosting guests"
          icon={BedDouble}
          tone="slate"
        />
        <MetricCard
          title="Under Maintenance"
          value={maintenance}
          helper="Rooms flagged for repair"
          icon={Wrench}
          tone="amber"
        />
        <MetricCard
          title="Reserved"
          value={reserved}
          helper="Rooms assigned to upcoming bookings"
          icon={Clock}
          tone="amber"
        />
      </section>

      {/* ── Quick actions ── */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'View all rooms',         href: '/housekeeping' },
              { label: 'Rooms needing attention', href: '/housekeeping?status=Maintenance' },
              { label: 'Occupied rooms',          href: '/housekeeping?status=Occupied' },
              { label: 'Available rooms',         href: '/housekeeping?status=Available' }
            ].map(({ label, href }) => (
              <Link
                key={label}
                to={href}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-800 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-lime-950"
              >
                {label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── Maintenance rooms list ── */}
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Rooms Needing Attention</h2>
            <Wrench className="h-5 w-5 text-amber-500" />
          </div>
          {maintenance === 0 ? (
            <p className="text-sm text-slate-500">No rooms are currently under maintenance.</p>
          ) : (
            <div className="space-y-2">
              {rooms
                .filter((r) => r.status === 'Maintenance')
                .slice(0, 6)
                .map((room) => (
                  <div
                    key={room._id}
                    className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Room {room.roomNumber}
                      </span>
                      <span className="text-xs text-slate-500">{room.type}</span>
                    </div>
                    <Link
                      to="/housekeeping"
                      className="text-xs font-semibold text-lime-700 hover:underline dark:text-lime-400"
                    >
                      Fix →
                    </Link>
                  </div>
                ))}
              {maintenance > 6 && (
                <Link
                  to="/housekeeping?status=Maintenance"
                  className="block pt-1 text-center text-xs font-semibold text-lime-700 hover:underline dark:text-lime-400"
                >
                  View all {maintenance} maintenance rooms
                </Link>
              )}
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}
