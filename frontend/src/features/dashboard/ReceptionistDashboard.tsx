/**
 * ReceptionistDashboard — visible to: Receptionist role
 *
 * Operational focus — arrivals, departures, room availability,
 * pending reservations, and outstanding folio balance.
 */
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BedDouble,
  CalendarClock,
  ClipboardList,
  CreditCard,
  LogIn,
  LogOut,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import type { UserRole } from '../../types/api';
import { getDashboardSummary } from './dashboardApi';

const money = new Intl.NumberFormat('en-RW', {
  style: 'currency',
  currency: 'RWF',
  maximumFractionDigits: 0
});

export function ReceptionistDashboard({ role: _role }: { role: UserRole }) {
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary', ''],
    queryFn: () => getDashboardSummary()
  });

  if (summaryQuery.isLoading) {
    return (
      <div>
        <PageHeader
          title="Reception Workspace"
          breadcrumb={['Workspace', 'Dashboard']}
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  if (summaryQuery.isError) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        message="Could not load your workspace data right now."
      />
    );
  }

  const s = summaryQuery.data!;
  const availableRooms = Math.max((s.roomsTotal ?? 0) - (s.occupiedRooms ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Reception Workspace"
        breadcrumb={['Workspace', 'Dashboard']}
      />

      {/* ── Primary operational metrics — NO revenue for Receptionist ── */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Today's Check-ins"
          value={s.arrivalsToday ?? 0}
          helper="Guests arriving today"
          icon={LogIn}
          tone="lime"
        />
        <MetricCard
          title="Today's Check-outs"
          value={s.departuresToday ?? 0}
          helper="Guests departing today"
          icon={LogOut}
          tone="slate"
        />
        <MetricCard
          title="Available Rooms"
          value={availableRooms}
          helper={`${s.occupiedRooms ?? 0} of ${s.roomsTotal ?? 0} rooms occupied`}
          icon={BedDouble}
          tone="amber"
        />
      </section>

      {/* ── Secondary metrics ── */}
      <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Pending Reservations"
          value={s.pendingReservations ?? 0}
          helper="Confirmed but not yet checked in"
          icon={ClipboardList}
          tone="amber"
        />
        <MetricCard
          title="Total Guests Today"
          value={(s.arrivalsToday ?? 0) + (s.departuresToday ?? 0)}
          helper="Arrivals and departures combined"
          icon={Users}
          tone="lime"
        />
        {/* Both Cashiers and Receptionists see outstanding folio balance */}
        <MetricCard
          title="Outstanding Folios"
          value={money.format(s.outstandingFolios ?? 0)}
          helper="Open folios pending settlement"
          icon={CreditCard}
          tone="red"
        />
      </section>

      {/* ── Quick actions tailored to role ── */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'New reservation',  href: '/reservations' },
              { label: 'Check in guest',   href: '/check-in' },
              { label: 'Check out guest',  href: '/check-out' },
              { label: 'Guest directory',  href: '/guests' },
              { label: 'View folios',      href: '/folios' },
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
        </div>

        {/* ── Upcoming arrivals summary panel ── */}
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today at a Glance</h2>
            <CalendarClock className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            <GlanceRow
              label="Arrivals expected"
              value={s.arrivalsToday ?? 0}
              tone="lime"
            />
            <GlanceRow
              label="Departures expected"
              value={s.departuresToday ?? 0}
              tone="slate"
            />
            <GlanceRow
              label="Rooms available now"
              value={availableRooms}
              tone="amber"
            />
            <GlanceRow
              label="Unconfirmed reservations"
              value={s.pendingReservations ?? 0}
              tone="red"
            />
          </div>
        </motion.div>
      </section>
    </div>
  );
}

// ─── Internal helper ───────────────────────────────────────────────────────

function GlanceRow({
  label,
  value,
  tone
}: {
  label: string;
  value: string | number;
  tone: 'lime' | 'slate' | 'amber' | 'red';
}) {
  const dots = {
    lime:  'bg-lime-500',
    slate: 'bg-slate-400',
    amber: 'bg-amber-400',
    red:   'bg-red-500'
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <span className={`h-2 w-2 rounded-full ${dots[tone]}`} />
        <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-950 dark:text-white">{value}</span>
    </div>
  );
}
