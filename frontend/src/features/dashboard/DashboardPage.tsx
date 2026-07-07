import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Banknote, BedDouble, CalendarClock, ChefHat, CreditCard, Package, Percent } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2 dark:border-slate-800 dark:bg-slate-900"
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Occupancy" value={`${summary?.occupancyRate ?? 0}%`} helper={`${summary?.occupiedRooms ?? 0} of ${summary?.roomsTotal ?? 0} rooms occupied`} icon={Percent} />
        <MetricCard title="Revenue today" value={money.format(summary?.revenueToday ?? 0)} helper="Completed payments" icon={Banknote} tone="emerald" />
        <MetricCard title="Pending reservations" value={summary?.pendingReservations ?? 0} helper="Need review or confirmation" icon={CalendarClock} tone="amber" />
        <MetricCard title="Kitchen queue" value={summary?.kitchenQueue ?? 0} helper="Orders received or preparing" icon={ChefHat} tone="slate" />
        <MetricCard title="Restaurant sales" value={money.format(summary?.restaurantSalesToday ?? 0)} helper="Orders posted today" icon={CreditCard} tone="emerald" />
        <MetricCard title="Arrivals today" value={summary?.arrivalsToday ?? 0} helper="Confirmed check-ins" icon={BedDouble} />
        <MetricCard title="Low stock" value={summary?.lowStockItems ?? 0} helper="Items at or below threshold" icon={Package} tone="red" />
        <MetricCard title="Outstanding folios" value={summary?.outstandingFolios ?? 0} helper="Open balances requiring action" icon={AlertTriangle} tone="amber" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Operational snapshot</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">Live property scope</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold">Portfolio</h2>
          <div className="mt-4 space-y-3">
            {isGlobal && portfolioQuery.data?.length ? (
              portfolioQuery.data.map((property) => (
                <div key={property.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
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
