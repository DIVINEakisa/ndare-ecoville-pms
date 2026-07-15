import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChefHat, Clock, MapPin, QrCode, RefreshCw,
  Utensils, X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useProperty } from '../../contexts/PropertyContext';
import { getProperties } from '../dashboard/dashboardApi';
import {
  listOrders,
  listPublicOrders,
  updateOrderStatus,
  updatePublicOrderStatus,
  type PublicOrder,
  type RestaurantOrder,
} from './restaurantApi';

const money = new Intl.NumberFormat('en-RW', {
  style: 'currency', currency: 'RWF', maximumFractionDigits: 0,
});

// Statuses shown as kanban lanes (Cancelled is handled separately)
const LANES = ['Received', 'Preparing', 'Ready', 'Delivered'] as const;
type LaneStatus = (typeof LANES)[number];

const laneStyle: Record<LaneStatus, { border: string; bg: string; text: string; dot: string }> = {
  Received:  { border: 'border-amber-400/50',  bg: 'bg-amber-500/10',  text: 'text-amber-500',  dot: 'bg-amber-400' },
  Preparing: { border: 'border-blue-400/50',   bg: 'bg-blue-500/10',   text: 'text-blue-400',   dot: 'bg-blue-400'  },
  Ready:     { border: 'border-lime-400/50',   bg: 'bg-lime-500/10',   text: 'text-lime-400',   dot: 'bg-lime-400'  },
  Delivered: { border: 'border-slate-400/30',  bg: 'bg-slate-500/5',   text: 'text-slate-400',  dot: 'bg-slate-400' },
};

function nextStatus(s: LaneStatus): LaneStatus | null {
  if (s === 'Received')  return 'Preparing';
  if (s === 'Preparing') return 'Ready';
  if (s === 'Ready')     return 'Delivered';
  return null;
}

// A unified order shape covering both staff and walk-in orders
type AnyOrder = {
  _id: string;
  orderNumber: string;
  status: LaneStatus;
  items: Array<{ name: string; quantity: number; total: number }>;
  totalAmount: number;
  createdAt: string;
  source: 'staff' | 'walkin';
  // walk-in extras
  guestName?: string;
  locationType?: 'room' | 'table';
  locationNumber?: string;
  notes?: string;
  // staff extras
  guestFullName?: string;
  roomNumber?: string;
};

function toAnyOrder(o: RestaurantOrder): AnyOrder {
  const guest = typeof o.guestId === 'object' ? o.guestId : null;
  const room  = typeof o.roomId  === 'object' ? o.roomId  : null;
  return {
    _id:          o._id,
    orderNumber:  o.orderNumber,
    status:       o.status as LaneStatus,
    items:        o.items,
    totalAmount:  o.totalAmount,
    createdAt:    o.createdAt,
    source:       'staff',
    guestFullName: guest?.fullName,
    roomNumber:    room?.roomNumber,
  };
}

function publicToAnyOrder(o: PublicOrder): AnyOrder {
  return {
    _id:            o._id,
    orderNumber:    o.orderNumber,
    status:         o.status as LaneStatus,
    items:          o.items,
    totalAmount:    o.totalAmount,
    createdAt:      o.createdAt,
    source:         'walkin',
    guestName:      o.guestName,
    locationType:   o.locationType,
    locationNumber: o.locationNumber,
    notes:          o.notes,
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export function KitchenQueuePage() {
  const { activePropertyId: propertyId, setActivePropertyId } = useProperty();
  const queryClient = useQueryClient();

  // Track which order IDs we've already seen so we can pulse new arrivals
  const seenIds = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const propertiesQuery = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties,
  });

  // Auto-select first property once loaded
  useEffect(() => {
    if (!propertyId && propertiesQuery.data?.length) {
      setActivePropertyId(propertiesQuery.data[0]._id);
    }
  }, [propertiesQuery.data, propertyId]);

  const staffQuery = useQuery({
    queryKey: ['kitchen-orders', propertyId],
    queryFn: () => listOrders({ propertyId: propertyId || undefined, limit: 200 }),
    refetchInterval: 10_000,
  });

  const publicQuery = useQuery({
    queryKey: ['kitchen-public-orders', propertyId],
    queryFn: () => listPublicOrders(propertyId),
    enabled: Boolean(propertyId),
    refetchInterval: 10_000,
  });

  // Detect newly arrived orders and pulse them for 8 s
  useEffect(() => {
    const allCurrent: AnyOrder[] = [
      ...(staffQuery.data?.items.map(toAnyOrder) ?? []),
      ...(publicQuery.data?.map(publicToAnyOrder) ?? []),
    ];
    const fresh = allCurrent.filter((o) => !seenIds.current.has(o._id));
    if (fresh.length > 0) {
      const freshIds = new Set(fresh.map((o) => o._id));
      setNewIds((prev) => new Set([...prev, ...freshIds]));
      fresh.forEach((o) => seenIds.current.add(o._id));
      // Remove pulse after 8 s
      setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          freshIds.forEach((id) => next.delete(id));
          return next;
        });
      }, 8_000);
    }
  }, [staffQuery.data, publicQuery.data]);

  const staffMutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: (updated) => {
      toast.success(`Order ${updated.orderNumber} → ${updated.status}`);
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
    onError: () => toast.error('Could not update order'),
  });

  const publicMutation = useMutation({
    mutationFn: updatePublicOrderStatus,
    onSuccess: (updated) => {
      toast.success(`Order ${updated.orderNumber} → ${updated.status}`);
      queryClient.invalidateQueries({ queryKey: ['kitchen-public-orders'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
    onError: () => toast.error('Could not update order'),
  });

  function advance(order: AnyOrder, status: LaneStatus) {
    if (order.source === 'staff') {
      staffMutation.mutate({ id: order._id, status: status as RestaurantOrder['status'] });
    } else {
      publicMutation.mutate({ id: order._id, status: status as PublicOrder['status'] });
    }
  }

  function cancel(order: AnyOrder) {
    if (order.source === 'staff') {
      staffMutation.mutate({ id: order._id, status: 'Cancelled' });
    } else {
      publicMutation.mutate({ id: order._id, status: 'Cancelled' });
    }
  }

  const isMutating = staffMutation.isPending || publicMutation.isPending;

  // Merge + sort oldest-first so urgent orders stay at the top
  const allOrders: AnyOrder[] = [
    ...(staffQuery.data?.items
      .filter((o) => o.status !== 'Cancelled')
      .map(toAnyOrder) ?? []),
    ...(publicQuery.data
      ?.filter((o) => o.status !== 'Cancelled')
      .map(publicToAnyOrder) ?? []),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const isLoading = staffQuery.isLoading || (Boolean(propertyId) && publicQuery.isLoading);

  const pendingCount = allOrders.filter(
    (o) => o.status === 'Received' || o.status === 'Preparing'
  ).length;

  return (
    <div>
      <PageHeader
        title="Kitchen Queue"
        breadcrumb={['Workspace', 'Kitchen']}
        actions={
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                {pendingCount} pending
              </span>
            )}
            <button
              onClick={() => { staffQuery.refetch(); publicQuery.refetch(); }}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        }
      />

      {/* Property selector */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 shrink-0">
          Property
        </label>
        <select
          value={propertyId}
          onChange={(e) => setActivePropertyId(e.target.value)}
          className="h-10 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-lime-700 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
        >
          <option value="">All properties</option>
          {propertiesQuery.data?.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />
          Auto-refreshes every 10s
        </div>
      </div>

      {/* Kanban board */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {LANES.map((l) => <Skeleton key={l} className="h-64" />)}
        </div>
      ) : allOrders.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          message="New orders from guests and staff will appear here automatically."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {LANES.map((lane) => {
            const laneOrders = allOrders.filter((o) => o.status === lane);
            const s = laneStyle[lane];
            return (
              <section
                key={lane}
                className={`rounded-2xl border-2 p-4 ${s.border} ${s.bg}`}
              >
                {/* Lane header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <h2 className={`text-sm font-bold uppercase tracking-wide ${s.text}`}>
                      {lane}
                    </h2>
                  </div>
                  <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-bold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                    {laneOrders.length}
                  </span>
                </div>

                {/* Order cards */}
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {laneOrders.map((order) => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        isNew={newIds.has(order._id)}
                        isMutating={isMutating}
                        onAdvance={advance}
                        onCancel={cancel}
                      />
                    ))}
                  </AnimatePresence>
                  {laneOrders.length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-400">Empty</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({
  order, isNew, isMutating, onAdvance, onCancel,
}: {
  order: AnyOrder;
  isNew: boolean;
  isMutating: boolean;
  onAdvance: (order: AnyOrder, status: LaneStatus) => void;
  onCancel: (order: AnyOrder) => void;
}) {
  const next = nextStatus(order.status);
  const canCancel = order.status === 'Received' || order.status === 'Preparing';

  // Elapsed time since order was placed
  const [elapsed, setElapsed] = useState(() => getElapsed(order.createdAt));
  useEffect(() => {
    const t = setInterval(() => setElapsed(getElapsed(order.createdAt)), 30_000);
    return () => clearInterval(t);
  }, [order.createdAt]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`relative rounded-xl border bg-white p-3.5 shadow-sm dark:bg-slate-900
        ${isNew
          ? 'border-lime-400 ring-2 ring-lime-400/40 dark:border-lime-500'
          : 'border-slate-200/80 dark:border-slate-700'
        }`}
    >
      {/* "NEW" badge */}
      {isNew && (
        <span className="absolute -right-2 -top-2 rounded-full bg-lime-500 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow">
          New
        </span>
      )}

      {/* Header row: order number + time */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {order.source === 'walkin'
            ? <QrCode className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            : <Utensils className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          }
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {order.orderNumber}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          {elapsed}
        </span>
      </div>

      {/* Guest / location info */}
      {order.source === 'walkin' && order.guestName && (
        <div className="mt-2 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <ChefHat className="h-3.5 w-3.5 shrink-0 text-lime-600" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {order.guestName}
            </p>
          </div>
          {order.locationType && order.locationNumber && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                {order.locationType} {order.locationNumber}
              </p>
            </div>
          )}
        </div>
      )}
      {order.source === 'staff' && (order.guestFullName || order.roomNumber) && (
        <div className="mt-2 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-400" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {[order.guestFullName, order.roomNumber ? `Room ${order.roomNumber}` : null]
              .filter(Boolean).join(' · ')}
          </p>
        </div>
      )}

      {/* Items list */}
      <ul className="mt-2 space-y-0.5">
        {order.items.map((item, i) => (
          <li key={i} className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              <span className="font-bold">{item.quantity}×</span> {item.name}
            </span>
            <span className="text-slate-400">{money.format(item.total)}</span>
          </li>
        ))}
      </ul>

      {/* Total */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700/60">
        <span className="text-xs text-slate-500">Total</span>
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {money.format(order.totalAmount)}
        </span>
      </div>

      {/* Notes */}
      {order.notes && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          📝 {order.notes}
        </p>
      )}

      {/* Action buttons */}
      {(next || canCancel) && (
        <div className="mt-3 flex gap-2">
          {next && (
            <button
              disabled={isMutating}
              onClick={() => onAdvance(order, next)}
              className="flex-1 rounded-xl bg-lime-700 py-2 text-xs font-bold text-white transition hover:bg-lime-600 disabled:opacity-50"
            >
              Mark {next}
            </button>
          )}
          {canCancel && (
            <button
              disabled={isMutating}
              onClick={() => onCancel(order)}
              title="Cancel order"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </motion.article>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getElapsed(createdAt: string): string {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}
