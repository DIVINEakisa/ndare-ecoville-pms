/**
 * DepartmentStaffDashboard — visible to: Department Staff role
 *
 * Focused on requisition submission and status tracking.
 * Shows the user's own requisition counts by status and a direct
 * shortcut to submit a new request.
 */
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Clock, ClipboardList, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../auth/AuthProvider';
import { useProperty } from '../../contexts/PropertyContext';
import { listRequisitions } from '../supply/supplyApi';

export function DepartmentStaffDashboard() {
  const { user } = useAuth();
  const { activePropertyId: contextPropertyId } = useProperty();

  const propertyId =
    contextPropertyId ||
    user?.activePropertyId ||
    (user?.assignedPropertyIds?.[0] as string | undefined);

  // Fetch all the user's own requisitions (backend scopes to requestedBy for Dept Staff)
  const requisitionsQuery = useQuery({
    queryKey: ['dept-dashboard-requisitions', propertyId],
    queryFn: () => listRequisitions({ propertyId: propertyId || undefined, limit: 100 }),
    enabled: Boolean(propertyId),
    refetchInterval: 30_000
  });

  if (requisitionsQuery.isLoading) {
    return (
      <div>
        <PageHeader title="Department Workspace" breadcrumb={['Workspace', 'Dashboard']} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  if (requisitionsQuery.isError) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        message="Could not load your requisition data right now."
      />
    );
  }

  const all = requisitionsQuery.data?.items ?? [];
  const pending  = all.filter((r) => r.status === 'Pending').length;
  const approved = all.filter((r) => r.status === 'Approved').length;
  const received = all.filter((r) => r.status === 'Received').length;
  const rejected = all.filter((r) => r.status === 'Rejected').length;

  // Most recent 5 requests for the activity panel
  const recent = all.slice(0, 5);

  return (
    <div>
      <PageHeader title="Department Workspace" breadcrumb={['Workspace', 'Dashboard']} />

      {/* ── Requisition status metrics ── */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Pending"
          value={pending}
          helper="Awaiting manager approval"
          icon={Clock}
          tone="amber"
        />
        <MetricCard
          title="Approved"
          value={approved}
          helper="Approved, awaiting delivery"
          icon={CheckCircle}
          tone="lime"
        />
        <MetricCard
          title="Received"
          value={received}
          helper="Delivered and closed"
          icon={CheckCircle}
          tone="slate"
        />
        <MetricCard
          title="Rejected"
          value={rejected}
          helper="Requests that were declined"
          icon={XCircle}
          tone="red"
        />
      </section>

      {/* ── Quick actions + recent activity ── */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Quick actions */}
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'New stock request',   href: '/requisitions' },
              { label: 'Pending approvals',   href: '/requisitions?status=Pending' },
              { label: 'Approved requests',   href: '/requisitions?status=Approved' },
              { label: 'All my requests',     href: '/requisitions' },
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

        {/* Recent requests */}
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Requests</h2>
            <ClipboardList className="h-5 w-5 text-slate-400" />
          </div>

          {recent.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <ClipboardList className="h-6 w-6 text-slate-400" />
              <p className="text-sm text-slate-500">No requests yet</p>
              <Link
                to="/requisitions"
                className="text-xs font-semibold text-lime-700 hover:underline dark:text-lime-400"
              >
                Submit your first request →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((req) => {
                const dot: Record<string, string> = {
                  Pending:  'bg-amber-400',
                  Approved: 'bg-blue-500',
                  Received: 'bg-emerald-500',
                  Rejected: 'bg-red-500'
                };
                return (
                  <div
                    key={req._id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${dot[req.status] ?? 'bg-slate-400'}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {req.requestNumber}
                        </p>
                        <p className="text-xs text-slate-500">{req.department}</p>
                      </div>
                    </div>
                    <span className="ml-3 shrink-0 text-xs font-semibold text-slate-500">
                      {req.status}
                    </span>
                  </div>
                );
              })}
              <Link
                to="/requisitions"
                className="flex w-full items-center justify-center gap-1 pt-1 text-xs font-semibold text-lime-700 hover:underline dark:text-lime-400"
              >
                View all requests <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}
