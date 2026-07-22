/**
 * CashierDashboard — visible to: Cashier role
 *
 * Focused exclusively on payment processing and invoice generation.
 * Surfaces outstanding folios, today's collection totals, and direct
 * shortcuts to settlement and reporting. No operational or room data shown.
 */
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, CreditCard, FileBarChart, Receipt, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { getDashboardSummary } from './dashboardApi';

const money = new Intl.NumberFormat('en-RW', {
  style: 'currency',
  currency: 'RWF',
  maximumFractionDigits: 0
});

export function CashierDashboard() {
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary', ''],
    queryFn: () => getDashboardSummary(),
    refetchInterval: 60_000
  });

  if (summaryQuery.isLoading) {
    return (
      <div>
        <PageHeader title="Cashier Workspace" breadcrumb={['Workspace', 'Dashboard']} />
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
        message="Could not load payment data right now."
      />
    );
  }

  const s = summaryQuery.data!;

  return (
    <div>
      <PageHeader title="Cashier Workspace" breadcrumb={['Workspace', 'Dashboard']} />

      {/* ── Payment metrics ── */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Outstanding Folios"
          value={money.format(s.outstandingFolios ?? 0)}
          helper="Open balances pending settlement"
          icon={CreditCard}
          tone="red"
        />
        <MetricCard
          title="Today's Revenue"
          value={money.format(s.revenueToday ?? 0)}
          helper="Payments collected today"
          icon={TrendingUp}
          tone="lime"
        />
        <MetricCard
          title="Restaurant Sales"
          value={money.format(s.restaurantSalesToday ?? 0)}
          helper="F&B charges posted today"
          icon={Receipt}
          tone="slate"
        />
      </section>

      {/* ── Quick actions + summary ── */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Quick actions */}
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Settle folio',        href: '/folios' },
              { label: 'Open folios',         href: '/folios?status=Open' },
              { label: 'Partially paid',      href: '/folios?status=Partially+Paid' },
              { label: 'Payment reports',     href: '/reports' },
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

        {/* Cashier summary panel */}
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Payment Summary</h2>
            <FileBarChart className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            <SummaryRow
              label="Outstanding balance"
              value={money.format(s.outstandingFolios ?? 0)}
              tone="red"
            />
            <SummaryRow
              label="Collected today"
              value={money.format(s.revenueToday ?? 0)}
              tone="lime"
            />
            <SummaryRow
              label="Restaurant charges"
              value={money.format(s.restaurantSalesToday ?? 0)}
              tone="slate"
            />
            <SummaryRow
              label="Guests checked in"
              value={s.occupiedRooms ?? 0}
              tone="amber"
            />
          </div>
        </motion.div>
      </section>
    </div>
  );
}

// ─── Internal helper ────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  tone
}: {
  label: string;
  value: string | number;
  tone: 'lime' | 'slate' | 'amber' | 'red';
}) {
  const dots: Record<typeof tone, string> = {
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
