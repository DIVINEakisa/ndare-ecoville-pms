import { useQuery } from '@tanstack/react-query';
import { Download, Package, Percent, Receipt, Utensils } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useProperty } from '../../contexts/PropertyContext';
import { downloadReportCsv, getReports } from './adminApi';

const money = new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 });

export function ReportsPage() {
  const { activePropertyId: propertyId } = useProperty();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const reports = useQuery({
    queryKey: ['reports', propertyId, from, to],
    queryFn: () => getReports({ propertyId, from, to })
  });

  const report = reports.data;
  const paymentData = report?.paymentsByMethod.map((item) => ({ name: item._id, value: item.total })) ?? [];
  const reservationData = report?.reservationsByStatus.map((item) => ({ name: item._id, value: item.count })) ?? [];

  return (
    <div>
      <PageHeader
        title="Reports"
        breadcrumb={['Workspace', 'Reports']}
        actions={
          <button className="flex items-center gap-2 rounded-lg bg-lime-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => downloadReportCsv({ propertyId, from, to })}>
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        }
      />

      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
      </div>

      {reports.isLoading ? <Skeleton className="h-96" /> : report && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Revenue" value={money.format(report.revenue.total)} helper={`${report.revenue.count} payments`} icon={Receipt} tone="emerald" />
            <MetricCard title="Occupancy" value={`${report.occupancy.rate}%`} helper={`${report.occupancy.occupiedRooms}/${report.occupancy.roomsTotal} rooms`} icon={Percent} />
            <MetricCard title="Restaurant" value={money.format(report.restaurant.reduce((sum, item) => sum + item.total, 0))} helper="Non-cancelled orders" icon={Utensils} tone="slate" />
            <MetricCard title="Low stock" value={report.inventory.lowStockItems} helper="Items below threshold" icon={Package} tone="amber" />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <ChartPanel title="Payments by method" data={paymentData} />
            <ChartPanel title="Reservations by status" data={reservationData} />
          </section>
        </>
      )}
    </div>
  );
}

function ChartPanel({ title, data }: { title: string; data: Array<{ name: string; value: number }> }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3F6212" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
