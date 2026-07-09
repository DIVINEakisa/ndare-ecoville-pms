import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Banknote, BedDouble, CalendarClock, ChefHat, CreditCard, Package, Percent, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../auth/AuthProvider';
import { getDashboardSummary, getPortfolioSummary, getProperties } from './dashboardApi';

const money = new Intl.NumberFormat('en-RW', {
  style: 'currency',
  currency: 'RWF',
  maximumFractionDigits: 0
});

export function DashboardPage() {
  const { user } = useAuth();
  const [propertyId, setPropertyId] = useState<string>('');
  const isGlobal = user?.role === 'Owner' || user?.role === 'Admin';

  const propertiesQuery = useQuery({ queryKey: ['properties'], queryFn: getProperties });
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary', propertyId],
    queryFn: () => getDashboardSummary(propertyId || undefined)
  });
  const portfolioQuery = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: getPortfolioSummary,
    enabled: isGlobal
  });

  if (summaryQuery.isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" breadcrumb={['Workspace', 'Dashboard']} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  if (summaryQuery.isError) {
    return <EmptyState title="Dashboard unavailable" message="We could not load your dashboard data right now." />;
  }

  const summary = summaryQuery.data;
  const chartData = [
    { name: 'Occupancy', value: summary?.occupancyRate ?? 0 },
    { name: 'Pending', value: summary?.pendingReservations ?? 0 },
    { name: 'Kitchen', value: summary?.kitchenQueue ?? 0 },
    { name: 'Low stock', value: summary?.lowStockItems ?? 0 }
  ];
  const revenueTrend = [
    { name: 'Mon', value: Math.round((summary?.revenueToday ?? 0) * 0.45) },
    { name: 'Tue', value: Math.round((summary?.revenueToday ?? 0) * 0.65) },
    { name: 'Wed', value: Math.round((summary?.revenueToday ?? 0) * 0.5) },
    { name: 'Thu', value: Math.round((summary?.revenueToday ?? 0) * 0.8) },
    { name: 'Fri', value: summary?.revenueToday ?? 0 }
  ];
  const availableRooms = Math.max((summary?.roomsTotal ?? 0) - (summary?.occupiedRooms ?? 0), 0);

  return (
    <div>
      <PageHeader
        title={isGlobal ? 'Owner Dashboard' : 'Property Dashboard'}
        breadcrumb={['Workspace', 'Dashboard']}
        actions={
          <div className="flex gap-2">
            <select
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm outline-none ring-lime-700 focus:ring-2 dark:border-slate-800 dark:bg-slate-900"
            >
              <option value="">{isGlobal ? 'All properties' : 'Assigned properties'}</option>
              {propertiesQuery.data?.map((property) => (
                <option key={property._id} value={property._id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Revenue" value={money.format(summary?.revenueToday ?? 0)} helper="Completed payments today" icon={Banknote} tone="emerald" />
        <MetricCard title="Occupancy" value={`${summary?.occupancyRate ?? 0}%`} helper={`${summary?.occupiedRooms ?? 0} of ${summary?.roomsTotal ?? 0} rooms occupied`} icon={Percent} />
        <MetricCard title="Available Rooms" value={availableRooms} helper="Ready or unoccupied inventory" icon={BedDouble} tone="slate" />
        <MetricCard title="Guests" value={(summary?.arrivalsToday ?? 0) + (summary?.departuresToday ?? 0)} helper="Arrivals and departures today" icon={Users} tone="amber" />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Revenue Chart</h2>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Today</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#65A30D" fill="#ECFCCB" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Occupancy Chart</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">Live property scope</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3F6212" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <DashboardWidget title="Today's Check-ins" value={summary?.arrivalsToday ?? 0} icon={CalendarClock} />
        <DashboardWidget title="Today's Check-outs" value={summary?.departuresToday ?? 0} icon={BedDouble} />
        <DashboardWidget title="Upcoming Reservations" value={summary?.pendingReservations ?? 0} icon={CalendarClock} tone="amber" />
        <DashboardWidget title="Low Stock Alerts" value={summary?.lowStockItems ?? 0} icon={Package} tone="red" />
        <DashboardWidget title="Recent Payments" value={money.format(summary?.revenueToday ?? 0)} icon={CreditCard} tone="emerald" />
        <DashboardWidget title="Pending Requisitions" value={summary?.lowStockItems ?? 0} icon={AlertTriangle} tone="amber" />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {['New reservation', 'Check in guest', 'Create order', 'New requisition'].map((action) => (
              <button key={action} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-800 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-lime-950">
                {action}
                <ArrowRight className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Portfolio</h2>
          <div className="mt-4 space-y-3">
            {isGlobal && portfolioQuery.data?.length ? (
              portfolioQuery.data.map((property) => (
                <div key={property.id} className="rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{property.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {property.occupiedRooms}/{property.roomsTotal} rooms occupied
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{property.occupancyRate}%</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{money.format(property.revenue)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No portfolio data" message="Property performance will appear once operational data exists." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function DashboardWidget({
  title,
  value,
  icon: Icon,
  tone = 'lime'
}: {
  title: string;
  value: string | number;
  icon: typeof CalendarClock;
  tone?: 'lime' | 'emerald' | 'amber' | 'red';
}) {
  const tones = {
    lime: 'bg-lime-50 text-lime-800 dark:bg-lime-950 dark:text-lime-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
  };

  return (
    <motion.article whileHover={{ y: -2 }} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.article>
  );
}
