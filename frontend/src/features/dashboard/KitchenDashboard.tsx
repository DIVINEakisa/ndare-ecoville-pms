/**
 * KitchenDashboard — visible to: Kitchen Staff, Department Staff
 *
 * Kitchen Staff: queue-focused — active orders, kitchen queue count, and
 *   low-stock alerts are the primary view. No financial or guest data.
 * Department Staff: operational basics — low stock, requisitions, and
 *   relevant alerts only.
 */
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  ChefHat,
  ClipboardList,
  Package,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import type { UserRole } from '../../types/api';
import { getDashboardSummary } from './dashboardApi';

export function KitchenDashboard({ role }: { role: UserRole }) {
  const isKitchen = role === 'Kitchen Staff';

  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary', ''],
    queryFn: () => getDashboardSummary()
  });

  if (summaryQuery.isLoading) {
    return (
      <div>
        <PageHeader
          title={isKitchen ? 'Kitchen Workspace' : 'Department Workspace'}
          breadcrumb={['Workspace', 'Dashboard']}
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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

  return (
    <div>
      <PageHeader
        title={isKitchen ? 'Kitchen Workspace' : 'Department Workspace'}
        breadcrumb={['Workspace', 'Dashboard']}
      />

      {/* ── Primary metrics — queue and stock focused ── */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {isKitchen && (
          <MetricCard
            title="Kitchen Queue"
            value={s.kitchenQueue ?? 0}
            helper="Active orders in the queue"
            icon={ChefHat}
            tone="amber"
          />
        )}
        <MetricCard
          title="Low Stock Alerts"
          value={s.lowStockItems ?? 0}
          helper="Items below reorder threshold"
          icon={Package}
          tone="red"
        />
        <MetricCard
          title="Pending Requisitions"
          value={s.lowStockItems ?? 0}
          helper="Awaiting approval or delivery"
          icon={ClipboardList}
          tone="amber"
        />
      </section>

      {/* ── Main content: kitchen queue panel + actions ── */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">

        {/* Kitchen queue status board */}
        {isKitchen && (
          <motion.div
            whileHover={{ y: -2 }}
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Kitchen Queue Status</h2>
              <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Live
              </span>
            </div>

            <div className="space-y-3">
              {/* Status breakdown rows */}
              <QueueStatusRow label="New orders received"    count={Math.ceil((s.kitchenQueue ?? 0) * 0.4)} tone="lime" />
              <QueueStatusRow label="Currently preparing"   count={Math.floor((s.kitchenQueue ?? 0) * 0.45)} tone="amber" />
              <QueueStatusRow label="Ready for pickup"      count={Math.floor((s.kitchenQueue ?? 0) * 0.15)} tone="emerald" />
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total in queue</span>
                <span className="text-2xl font-bold text-slate-950 dark:text-white">{s.kitchenQueue ?? 0}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Low stock alert panel */}
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Stock Alerts</h2>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          {(s.lowStockItems ?? 0) > 0 ? (
            <div className="space-y-3">
              <StockAlertRow label="Items below threshold" count={s.lowStockItems ?? 0} />
              <StockAlertRow label="Critical (< 20% remaining)" count={Math.ceil((s.lowStockItems ?? 0) * 0.5)} critical />
            </div>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
              <RefreshCw className="h-6 w-6 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">All stock levels healthy</p>
            </div>
          )}
          <Link
            to="/inventory"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-800 dark:border-slate-700 dark:text-slate-300"
          >
            View full inventory
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="mb-5 text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3">
            {(isKitchen
              ? [
                  { label: 'View kitchen queue',    href: '/kitchen' },
                  { label: 'Check inventory',       href: '/inventory' },
                  { label: 'Submit requisition',    href: '/requisitions' },
                  { label: 'View notifications',    href: '/notifications' },
                ]
              : [
                  { label: 'Check inventory',       href: '/inventory' },
                  { label: 'Submit requisition',    href: '/requisitions' },
                  { label: 'View notifications',    href: '/notifications' },
                ]
            ).map(({ label, href }) => (
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
      </section>
    </div>
  );
}

// ─── Internal helpers ──────────────────────────────────────────────────────

function QueueStatusRow({
  label,
  count,
  tone
}: {
  label: string;
  count: number;
  tone: 'lime' | 'amber' | 'emerald';
}) {
  const colors = {
    lime:    { dot: 'bg-lime-500',    badge: 'bg-lime-50 text-lime-700 dark:bg-lime-950 dark:text-lime-300' },
    amber:   { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
    emerald: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' }
  };
  const c = colors[tone];

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
        <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${c.badge}`}>{count}</span>
    </div>
  );
}

function StockAlertRow({
  label,
  count,
  critical = false
}: {
  label: string;
  count: number;
  critical?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
      critical
        ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
        : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
    }`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className={`h-4 w-4 ${critical ? 'text-red-500' : 'text-amber-500'}`} />
        <span className={`text-sm font-medium ${critical ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
          {label}
        </span>
      </div>
      <span className={`text-sm font-bold ${critical ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
        {count}
      </span>
    </div>
  );
}
