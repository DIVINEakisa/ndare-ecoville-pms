import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, MapPin, QrCode, RefreshCw, Utensils } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { getProperties } from '../dashboard/dashboardApi';
import {
  listOrders,
  listPublicOrders,
  updateOrderStatus,
  updatePublicOrderStatus,
  type PublicOrder,
  type RestaurantOrder
} from './restaurantApi';

const money = new Intl.NumberFormat('en-RW', {
  style: 'currency', currency: 'RWF', maximumFractionDigits: 0,
});

const LANES: RestaurantOrder['status'][] = ['Received', 'Preparing', 'Ready', 'Delivered'];

const laneColors: Record<string, string> = {
  Received:  'border-amber-400/40 bg-amber-500/10',
  Preparing: 'border-blue-400/40 bg-blue-500/10',
  Ready:     'border-lime-400/40 bg-lime-500/10',
  Delivered: 'border-slate-400/30 bg-slate-500/5',
};

const laneTextColors: Record<string, string> = {
  Received:  'text-amber-600 dark:text-amber-400',
  Preparing: 'text-blue-600 dark:text-blue-400',
  Ready:     'text-lime-700 dark:text-lime-400',
  Delivered: 'text-slate-500 dark:text-slate-400',
};

function nextStatus(status: RestaurantOrder['status']): RestaurantOrder['status'] | null {
  if (status === 'Received')  return 'Preparing';
  if (status === 'Preparing') return 'Ready';
  if (status === 'Ready')     return 'Delivered';
  return null;
}

type Tab = 'staff' | 'walkin';

// ─── Page ─────────────────────────────────────────────────────────────────────
export function KitchenQueuePage() {
  const [tab, setTab]             = useState<Tab>('staff');
  const [propertyId, setPropertyId] = useState('');
  const queryClient = useQueryClient();

  const propertiesQuery = useQuery({ queryKey: ['properties'], queryFn: getProperties });

  // Staff orders (existing restaurant orders)
  const staffOrdersQuery = useQuery({
    queryKey: ['kitchen-orders', propertyId],
    queryFn: () => listOrders({ propertyId: propertyId || undefined, limit: 100 }),
    refetchInterval: 20_000, // auto-refresh every 20s
  });

  // Walk-in / QR public orders
  const publicOrdersQuery = useQuery({
    queryKey: ['kitchen-public-orders', propertyId],
    queryFn: () => listPublicOrders(propertyId),
    enabled: Boolean(propertyId) && tab === 'walkin',
    refetchInterval: 15_000,
  });

  const staffMutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => {
      toast.success('Order updated');
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: () => toast.error('Could not update order'),
  });

  const publicMutation = useMutation({
    mutationFn: updatePublicOrderStatus,
    onSuccess: (updated) => {
      toast.success(`Order marked ${updated.status}`);
      queryClient.invalidateQueries({ queryKey: ['kitchen-public-orders'] });
    },
    onError: () => toast.error('Could not update order'),
  });

  const publicPendingCount = publicOrdersQuery.data?.filter(
    (o) => o.status === 'Received' || o.status === 'Preparing'
  ).length ?? 0;

  return (
    <div>
      <PageHeader
        title="Kitchen Queue"
        breadcrumb={['Workspace', 'Kitchen']}
        actions={
          <button
            onClick={() => {
              staffOrdersQuery.refetch();
              publicOrdersQuery.refetch();
            }}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        }
      />

      {/* ── Tab bar + property selector ── */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <KitchenTabBtn active={tab === 'staff'} onClick={() => setTab('staff')}>
            <Utensils className="h-4 w-4" /> Restaurant Orders
          </KitchenTabBtn>
          <KitchenTabBtn active={tab === 'walkin'} onClick={() => setTab('walkin')}>
            <QrCode className="h-4 w-4" />
            Walk-in / QR Orders
            {publicPendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {publicPendingCount}
              </span>
            )}
          </KitchenTabBtn>
        </div>

        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-lime-700 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
        >
          <option value="">All properties</option>
          {propertiesQuery.data?.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* ── Tab panels ── */}
      <AnimatePresence mode="wait">
        {tab === 'staff' && (
          <motion.div key="staff"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}
          >
            <StaffOrdersTab
              orders={staffOrdersQuery.data?.items ?? []}
              loading={staffOrdersQuery.isLoading}
              onAdvance={(id, status) => staffMutation.mutate({ id, status })}
              isPending={staffMutation.isPending}
            />
          </motion.div>
        )}
        {tab === 'walkin' && (
          <motion.div key="walkin"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}
          >
            <WalkInOrdersTab
              orders={publicOrdersQuery.data ?? []}
              loading={publicOrdersQuery.isLoading}
              noProperty={!propertyId}
              onAdvance={(id, status) => publicMutation.mutate({ id, status })}
              isPending={publicMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab 1: Staff / restaurant orders (kanban lanes) ─────────────────────────
function StaffOrdersTab({
  orders, loading, onAdvance, isPending,
}: {
  orders: RestaurantOrder[];
  loading: boolean;
  onAdvance: (id: string, status: RestaurantOrder['status']) => void;
  isPending: boolean;
}) {
  if (loading) return <Skeleton className="h-80" />;
  if (!orders.length) {
    return <EmptyState title="No kitchen orders" message="New restaurant orders will appear in the Received lane." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {LANES.map((lane) => {
        const laneOrders = orders.filter((o) => o.status === lane);
        return (
          <section
            key={lane}
            className={`rounded-2xl border-2 p-4 ${laneColors[lane]}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-sm font-bold uppercase tracking-wide ${laneTextColors[lane]}`}>
                {lane}
              </h2>
              <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-bold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                {laneOrders.length}
              </span>
            </div>
            <div className="space-y-3">
              {laneOrders.map((order) => {
                const next = nextStatus(order.status);
                return (
                  <article
                    key={order._id}
                    className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {order.orderNumber}
                      </p>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {new Date(order.createdAt).toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {money.format(order.totalAmount)}
                    </p>
                    {next && (
                      <button
                        disabled={isPending}
                        onClick={() => onAdvance(order._id, next)}
                        className="mt-3 w-full rounded-xl bg-lime-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-lime-600 disabled:opacity-50"
                      >
                        Mark {next}
                      </button>
                    )}
                  </article>
                );
              })}
              {laneOrders.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">Empty</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ─── Tab 2: Walk-in / QR public orders ────────────────────────────────────────
function WalkInOrdersTab({
  orders, loading, noProperty, onAdvance, isPending,
}: {
  orders: PublicOrder[];
  loading: boolean;
  noProperty: boolean;
  onAdvance: (id: string, status: PublicOrder['status']) => void;
  isPending: boolean;
}) {
  if (noProperty) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <QrCode className="mx-auto mb-3 h-10 w-10 text-slate-400" />
        <p className="font-semibold text-slate-700 dark:text-slate-200">Select a property</p>
        <p className="mt-1 text-sm text-slate-500">
          Choose a property above to view its walk-in QR orders.
        </p>
      </div>
    );
  }

  if (loading) return <Skeleton className="h-80" />;

  if (!orders.length) {
    return (
      <EmptyState
        title="No walk-in orders"
        message="Orders placed via QR code will appear here in real time."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {LANES.map((lane) => {
        const laneOrders = orders.filter((o) => o.status === lane);
        return (
          <section
            key={lane}
            className={`rounded-2xl border-2 p-4 ${laneColors[lane]}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-sm font-bold uppercase tracking-wide ${laneTextColors[lane]}`}>
                {lane}
              </h2>
              <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-bold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                {laneOrders.length}
              </span>
            </div>
            <div className="space-y-3">
              {laneOrders.map((order) => {
                const next = nextStatus(order.status);
                return (
                  <article
                    key={order._id}
                    className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    {/* Order header */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {order.orderNumber}
                      </p>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {new Date(order.createdAt).toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Guest name + location */}
                    <div className="mt-2 flex items-center gap-1.5">
                      <ChefHat className="h-3.5 w-3.5 shrink-0 text-lime-600" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {order.guestName}
                      </p>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                        {order.locationType} {order.locationNumber}
                      </p>
                    </div>

                    {/* Items */}
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                    </p>

                    {/* Total */}
                    <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {money.format(order.totalAmount)}
                    </p>

                    {/* Notes */}
                    {order.notes && (
                      <p className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                        📝 {order.notes}
                      </p>
                    )}

                    {/* Advance button */}
                    {next && (
                      <button
                        disabled={isPending}
                        onClick={() => onAdvance(order._id, next)}
                        className="mt-3 w-full rounded-xl bg-lime-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-lime-600 disabled:opacity-50"
                      >
                        Mark {next}
                      </button>
                    )}
                  </article>
                );
              })}
              {laneOrders.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">Empty</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function KitchenTabBtn({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-white'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
