import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BedDouble, CalendarDays, ChefHat, ChevronDown,
  ChevronUp, CreditCard, Filter, History,
  LogIn, LogOut, Receipt, Utensils
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { getProperties } from '../dashboard/dashboardApi';
import { listReservations } from '../operations/operationsApi';
import { listOrders } from '../restaurant/restaurantApi';
import { apiClient } from '../../services/apiClient';
import type { ApiResponse, PaginationMeta, Reservation } from '../../types/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

type PaymentRecord = {
  _id: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
  reference?: string;
  guestId?: { fullName?: string } | string;
  folioId?: string;
};

type HistoryEvent = {
  id: string;
  time: string;       // ISO
  category: 'reservation' | 'order' | 'payment' | 'checkin' | 'checkout';
  title: string;
  subtitle: string;
  detail: string;
  badge: string;
  badgeColor: string;
  raw: unknown;
};

// ─── API helpers ───────────────────────────────────────────────────────────────

async function listPayments(params: Record<string, string | undefined>) {
  const { data } = await apiClient.get<ApiResponse<PaymentRecord[]> & { meta: PaginationMeta }>(
    '/payments',
    { params }
  );
  return data.data;
}

// ─── Money formatter ───────────────────────────────────────────────────────────

const money = new Intl.NumberFormat('en-RW', {
  style: 'currency', currency: 'RWF', maximumFractionDigits: 0,
});

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-RW', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-RW', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function guestName(guestId: unknown): string {
  if (!guestId) return '—';
  if (typeof guestId === 'object' && guestId !== null && 'fullName' in guestId)
    return (guestId as { fullName: string }).fullName;
  return String(guestId).slice(-6);
}

// ─── Normalise everything into HistoryEvent ────────────────────────────────────

function reservationToEvent(r: Reservation): HistoryEvent {
  const guest = guestName(r.guestId);
  const room  = typeof r.roomId === 'object' && r.roomId !== null
    ? `Room ${(r.roomId as { roomNumber: string }).roomNumber}`
    : 'Room —';

  const isCheckedIn  = r.status === 'Checked In';
  const isCheckedOut = r.status === 'Checked Out';
  const category = isCheckedIn ? 'checkin' : isCheckedOut ? 'checkout' : 'reservation';

  const badgeColors: Record<string, string> = {
    Pending:       'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    Confirmed:     'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',
    'Checked In':  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    'Checked Out': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    Cancelled:     'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
    'No Show':     'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  };

  return {
    id:         r._id,
    time:       r.checkIn,
    category,
    title:      `${isCheckedIn ? 'Check-in' : isCheckedOut ? 'Check-out' : 'Reservation'} · ${guest}`,
    subtitle:   `${room} · ${fmtDate(r.checkIn)} → ${fmtDate(r.checkOut)}`,
    detail:     `${r.source} · ${money.format(r.totalAmount)} · ${r.adults} adult${r.adults !== 1 ? 's' : ''}${r.children ? `, ${r.children} child${r.children !== 1 ? 'ren' : ''}` : ''}${r.notes ? ` · ${r.notes}` : ''}`,
    badge:      r.status,
    badgeColor: badgeColors[r.status] ?? 'bg-slate-100 text-slate-600',
    raw:        r,
  };
}

function orderToEvent(o: {
  _id: string; orderNumber: string; status: string;
  items: Array<{ name: string; quantity: number }>; totalAmount: number;
  createdAt: string; guestId?: unknown;
}): HistoryEvent {
  const badgeColors: Record<string, string> = {
    Received:  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    Preparing: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    Ready:     'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',
    Delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    Cancelled: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
  };
  return {
    id:         o._id,
    time:       o.createdAt,
    category:   'order',
    title:      `Restaurant Order · ${o.orderNumber}`,
    subtitle:   o.items.map((i) => `${i.quantity}× ${i.name}`).join(', '),
    detail:     `${money.format(o.totalAmount)} · ${guestName(o.guestId)}`,
    badge:      o.status,
    badgeColor: badgeColors[o.status] ?? 'bg-slate-100 text-slate-600',
    raw:        o,
  };
}

function paymentToEvent(p: PaymentRecord): HistoryEvent {
  const badgeColors: Record<string, string> = {
    Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    Pending:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    Failed:    'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
    Refunded:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return {
    id:         p._id,
    time:       p.paidAt,
    category:   'payment',
    title:      `Payment · ${p.method}`,
    subtitle:   money.format(p.amount),
    detail:     [
      guestName(p.guestId),
      p.reference ? `Ref: ${p.reference}` : null,
    ].filter(Boolean).join(' · '),
    badge:      p.status,
    badgeColor: badgeColors[p.status] ?? 'bg-slate-100 text-slate-600',
    raw:        p,
  };
}

// ─── Category icon map ─────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<HistoryEvent['category'], React.ElementType> = {
  reservation: BedDouble,
  checkin:     LogIn,
  checkout:    LogOut,
  order:       Utensils,
  payment:     CreditCard,
};

const CATEGORY_COLOR: Record<HistoryEvent['category'], string> = {
  reservation: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  checkin:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  checkout:    'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  order:       'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  payment:     'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',
};

// ─── Page ──────────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);
const WEEK_AGO = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

export function HistoryPage() {
  const [propertyId, setPropertyId] = useState('');
  const [from, setFrom]             = useState(WEEK_AGO);
  const [to, setTo]                 = useState(TODAY);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState<'all' | HistoryEvent['category']>('all');

  const propertiesQuery = useQuery({ queryKey: ['properties'], queryFn: getProperties });

  const reservationsQuery = useQuery({
    queryKey: ['history-reservations', propertyId, from, to],
    queryFn: () => listReservations({
      propertyId: propertyId || undefined,
      from, to, limit: 100,
    }),
    enabled: Boolean(from && to),
  });

  const ordersQuery = useQuery({
    queryKey: ['history-orders', propertyId, from, to],
    queryFn: () => listOrders({
      propertyId: propertyId || undefined,
      limit: 100,
    }),
    enabled: Boolean(from && to),
  });

  const paymentsQuery = useQuery({
    queryKey: ['history-payments', propertyId, from, to],
    queryFn: () => listPayments({
      propertyId: propertyId || undefined,
      from, to,
    }),
    enabled: Boolean(from && to),
  });

  const isLoading = reservationsQuery.isLoading || ordersQuery.isLoading || paymentsQuery.isLoading;

  // Merge and sort descending (newest first)
  const allEvents: HistoryEvent[] = [
    ...(reservationsQuery.data?.items ?? []).map(reservationToEvent),
    ...(ordersQuery.data?.items ?? []).map(orderToEvent),
    ...((paymentsQuery.data as PaymentRecord[] | undefined) ?? []).map(paymentToEvent),
  ]
    .filter((e) => {
      if (category !== 'all' && e.category !== category) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.subtitle.toLowerCase().includes(q) ||
          e.detail.toLowerCase().includes(q) ||
          e.badge.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // Group by calendar day
  const grouped = allEvents.reduce<Record<string, HistoryEvent[]>>((acc, event) => {
    const day = new Date(event.time).toLocaleDateString('en-RW', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(event);
    return acc;
  }, {});

  const totalEvents = allEvents.length;
  const paymentTotal = allEvents
    .filter((e) => e.category === 'payment' && e.badge === 'Completed')
    .reduce((sum, e) => {
      const p = e.raw as PaymentRecord;
      return sum + (p.amount ?? 0);
    }, 0);

  return (
    <div>
      <PageHeader
        title="History"
        breadcrumb={['Workspace', 'History']}
        actions={
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <History className="h-4 w-4 text-lime-700" />
            {totalEvents} events
          </div>
        }
      />

      {/* ── Filters ── */}
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Filters</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Property */}
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className={fieldCls}
          >
            <option value="">All properties</option>
            {propertiesQuery.data?.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>

          {/* Date from */}
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className={`${fieldCls} pl-9`} />
          </div>

          {/* Date to */}
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className={`${fieldCls} pl-9`} />
          </div>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className={fieldCls}
          >
            <option value="all">All types</option>
            <option value="checkin">Check-ins</option>
            <option value="checkout">Check-outs</option>
            <option value="reservation">Reservations</option>
            <option value="order">Restaurant orders</option>
            <option value="payment">Payments</option>
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={fieldCls}
          />
        </div>

        {/* Quick-date shortcuts */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: 'Today',      days: 0 },
            { label: 'Last 7 days', days: 7 },
            { label: 'Last 30 days', days: 30 },
            { label: 'Last 90 days', days: 90 },
          ].map(({ label, days }) => (
            <button key={label} type="button"
              onClick={() => {
                const t = new Date().toISOString().slice(0, 10);
                const f = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
                setFrom(f); setTo(t);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-lime-400 hover:bg-lime-50 hover:text-lime-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-lime-700 dark:hover:bg-lime-950/30 dark:hover:text-lime-300"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary strip ── */}
      {!isLoading && totalEvents > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard icon={History} label="Total events" value={String(totalEvents)} color="slate" />
          <SummaryCard icon={Receipt} label="Revenue collected"
            value={money.format(paymentTotal)} color="emerald" />
          <SummaryCard icon={ChefHat} label="Restaurant orders"
            value={String(allEvents.filter((e) => e.category === 'order').length)} color="amber" />
        </div>
      )}

      {/* ── Timeline ── */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : totalEvents === 0 ? (
        <EmptyState
          title="No events found"
          message="Try a different date range or remove filters."
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([day, events]) => (
            <DayGroup key={day} day={day} events={events} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Day group ─────────────────────────────────────────────────────────────────

function DayGroup({ day, events }: { day: string; events: HistoryEvent[] }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      {/* Day header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="mb-3 flex w-full items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {day}
          </span>
          <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-bold text-lime-700 dark:bg-lime-950 dark:text-lime-300">
            {events.length}
          </span>
        </div>
        {collapsed
          ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          : <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 overflow-hidden"
          >
            {events.map((event) => <EventRow key={event.id} event={event} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Event row ─────────────────────────────────────────────────────────────────

function EventRow({ event }: { event: HistoryEvent }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICON[event.category];

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 px-4 py-3.5 text-left"
      >
        {/* Icon */}
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${CATEGORY_COLOR[event.category]}`}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{event.title}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${event.badgeColor}`}>
              {event.badge}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{event.subtitle}</p>
        </div>

        {/* Time + expand */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs text-slate-400">{fmtDateTime(event.time)}</span>
          {expanded
            ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
              <p className="text-xs text-slate-600 dark:text-slate-300">{event.detail || '—'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon, label, value, color,
}: { icon: React.ElementType; label: string; value: string; color: 'slate' | 'emerald' | 'amber' }) {
  const colors = {
    slate:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    amber:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colors[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-base font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

// ─── Shared style ──────────────────────────────────────────────────────────────

const fieldCls =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ' +
  'ring-lime-700 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
