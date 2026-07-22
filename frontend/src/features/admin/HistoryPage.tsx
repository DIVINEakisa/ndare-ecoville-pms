import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpDown,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Filter,
  History,
  LogIn,
  LogOut,
  Phone,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useProperty } from '../../contexts/PropertyContext';
import { apiClient } from '../../services/apiClient';
import type { ApiResponse, PaginationMeta } from '../../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type GuestPopulated = {
  _id: string;
  fullName: string;
  phone?: string;
  email?: string;
  nationality?: string;
  documentType?: string;
  documentNumber?: string;
};

type RoomPopulated = {
  _id: string;
  roomNumber: string;
  name?: string;
  type: string;
  floor?: number;
};

type ReceptionistPopulated = {
  _id: string;
  fullName: string;
  role?: string;
};

type HistoryItem = {
  _id: string;
  guestId: GuestPopulated;
  roomId: RoomPopulated;
  createdBy?: ReceptionistPopulated;
  source: string;
  status: 'Checked Out' | 'Cancelled' | 'No Show';
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  createdAt: string;
};

type HistorySummary = {
  totalStays: number;
  cancelledCount: number;
  noShowCount: number;
  todayCheckouts: number;
  totalRevenue: number;
};

type HistoryListResponse = {
  items: HistoryItem[];
  meta: PaginationMeta;
  summary: HistorySummary;
};

type FolioItem = {
  _id: string;
  source: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  postedAt: string;
};

type Payment = {
  _id: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
  reference?: string;
};

type FolioDetail = {
  _id: string;
  status: string;
  subtotal: number;
  taxTotal: number;
  paidTotal: number;
  balance: number;
};

type TimelineEvent = {
  _id: string;
  timestamp: string;
  action: string;
  description: string;
  performedBy: { name: string; role: string };
};

type Charges = { room: number; restaurant: number; laundry: number; other: number };

type HistoryDetailResponse = {
  reservation: HistoryItem & {
    guestId: GuestPopulated & { emergencyContact?: { name?: string; phone?: string; relationship?: string } };
  };
  folio: FolioDetail | null;
  folioItems: FolioItem[];
  payments: Payment[];
  charges: Charges;
  timeline: TimelineEvent[];
};

type GuestStay = {
  _id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  roomId?: { roomNumber: string; type: string };
};

type GuestHistoryResponse = {
  guest: GuestPopulated;
  stats: {
    totalVisits: number;
    totalSpent: number;
    avgNights: number;
    favoriteRoom: string | null;
    lastVisit: string | null;
  };
  stays: GuestStay[];
};

type Receptionist = { _id: string; fullName: string; role?: string };

// ─── API functions ────────────────────────────────────────────────────────────

async function fetchHistory(params: Record<string, string | number | undefined>): Promise<HistoryListResponse> {
  const clean: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') clean[k] = v;
  }
  const { data } = await apiClient.get<{
    success: boolean;
    data: HistoryItem[];
    meta: PaginationMeta & { summary?: HistorySummary };
    message: string;
  }>('/history', { params: clean });

  return {
    items: data.data,
    meta: data.meta,
    summary: data.meta?.summary ?? {
      totalStays: 0, cancelledCount: 0, noShowCount: 0, todayCheckouts: 0, totalRevenue: 0,
    },
  };
}

async function fetchHistoryDetail(id: string): Promise<HistoryDetailResponse> {
  const { data } = await apiClient.get<ApiResponse<HistoryDetailResponse>>(`/history/${id}`);
  return data.data;
}

async function fetchGuestHistory(guestId: string): Promise<GuestHistoryResponse> {
  const { data } = await apiClient.get<ApiResponse<GuestHistoryResponse>>(`/history/guest/${guestId}`);
  return data.data;
}

async function fetchReceptionists(): Promise<Receptionist[]> {
  const { data } = await apiClient.get<ApiResponse<Receptionist[]>>('/history/receptionists');
  return data.data;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const money = new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 });

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-RW', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' });
}

function calcNights(checkIn: string, checkOut: string) {
  return Math.max(Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000), 1);
}

const TODAY = new Date().toISOString().slice(0, 10);
const MONTH_AGO = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

const fieldCls =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ' +
  'ring-lime-700 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'Checked Out') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Checked Out
      </span>
    );
  }
  if (status === 'Cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Cancelled
      </span>
    );
  }
  if (status === 'No Show') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        No Show
      </span>
    );
  }
  return <span className="text-xs text-slate-500">{status}</span>;
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Settled: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
    'Partially Paid': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
    Open: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900',
    Void: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? map['Open']}`}>
      {status}
    </span>
  );
}

// ─── Timeline helpers ─────────────────────────────────────────────────────────

const timelineConfig: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  CREATE_RESERVATION: { label: 'Reservation Created', Icon: FileText, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  CHECK_IN: { label: 'Check-in Completed', Icon: LogIn, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  CHECK_OUT: { label: 'Check-out Completed', Icon: LogOut, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  CANCEL_RESERVATION: { label: 'Reservation Cancelled', Icon: X, color: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' },
  UPDATE_RESERVATION: { label: 'Reservation Updated', Icon: RefreshCw, color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  ADD_FOLIO_ITEM: { label: 'Charge Added', Icon: Receipt, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  SETTLE_PAYMENT: { label: 'Payment Received', Icon: CreditCard, color: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300' },
  CREATE_FOLIO: { label: 'Folio Created', Icon: FileText, color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300' },
};

// ─── Export helpers ───────────────────────────────────────────────────────────

function exportCSV(items: HistoryItem[]) {
  const headers = [
    'Reservation ID', 'Guest Name', 'Room', 'Room Type', 'Check-in', 'Check-out',
    'Nights', 'Total Amount (RWF)', 'Status', 'Receptionist',
  ];
  const rows = items.map((r) => [
    r._id,
    r.guestId.fullName,
    r.roomId.roomNumber,
    r.roomId.type,
    fmtDate(r.checkIn),
    fmtDate(r.checkOut),
    calcNights(r.checkIn, r.checkOut),
    r.totalAmount,
    r.status,
    r.createdBy?.fullName ?? '',
  ]);
  const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stay-history-${TODAY}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function HistoryPage() {
  const { activePropertyId: propertyId } = useProperty();
  const [dateFrom, setDateFrom] = useState(MONTH_AGO);
  const [dateTo, setDateTo] = useState(TODAY);
  const [search, setSearch] = useState('');
  const [guestName, setGuestName] = useState('');
  const [reservationId, setReservationId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [status, setStatus] = useState('');
  const [receptionistId, setReceptionistId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const params = {
    dateFrom, dateTo, search, guestName, reservationId, roomNumber,
    status, receptionistId, paymentStatus, page, limit: 20, propertyId,
  };

  const historyQuery = useQuery({
    queryKey: ['history', params],
    queryFn: () => fetchHistory(params),
  });

  const receptionistsQuery = useQuery({
    queryKey: ['history-receptionists', propertyId],
    queryFn: fetchReceptionists,
    staleTime: 5 * 60_000,
  });

  const items = historyQuery.data?.items ?? [];
  const meta = historyQuery.data?.meta;
  const summary = historyQuery.data?.summary;
  const isLoading = historyQuery.isLoading;

  function resetFilters() {
    setDateFrom(MONTH_AGO); setDateTo(TODAY); setSearch('');
    setGuestName(''); setReservationId(''); setRoomNumber('');
    setStatus(''); setReceptionistId(''); setPaymentStatus(''); setPage(1);
  }

  const hasActiveFilters = search || guestName || reservationId || roomNumber || status || receptionistId || paymentStatus;

  return (
    <div>
      <PageHeader
        title="Stay History"
        breadcrumb={['Workspace', 'History']}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={() => items.length > 0 && exportCSV(items)}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-lime-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-lime-800 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        }
      />

      {/* ── Summary Cards ── */}
      {isLoading ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : summary && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard icon={History} label="Completed Stays" value={summary.totalStays.toLocaleString()} color="indigo" />
          <SummaryCard icon={LogOut} label="Today's Check-outs" value={summary.todayCheckouts.toLocaleString()} color="emerald" />
          <SummaryCard icon={X} label="Cancelled" value={summary.cancelledCount.toLocaleString()} color="red" />
          <SummaryCard icon={AlertTriangle} label="No Shows" value={summary.noShowCount.toLocaleString()} color="amber" />
          <SummaryCard icon={TrendingUp} label="Total Revenue" value={money.format(summary.totalRevenue)} color="lime" wide />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Top toolbar */}
        <div className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by guest, room, reservation ID…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`${fieldCls} pl-9`}
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition ${showFilters ? 'border-lime-500 bg-lime-50 text-lime-700 dark:bg-lime-950/30 dark:text-lime-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-lime-700 text-[9px] font-bold text-white">
                ✓
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Expanded filters */}
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Date from */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">From</label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date" value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      className={`${fieldCls} pl-9`}
                    />
                  </div>
                </div>
                {/* Date to */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">To</label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date" value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                      className={`${fieldCls} pl-9`}
                    />
                  </div>
                </div>
                {/* Guest Name */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">Guest Name</label>
                  <input
                    type="text" placeholder="e.g. John Doe" value={guestName}
                    onChange={(e) => { setGuestName(e.target.value); setPage(1); }}
                    className={fieldCls}
                  />
                </div>
                {/* Reservation ID */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">Reservation ID</label>
                  <input
                    type="text" placeholder="e.g. 684a3…" value={reservationId}
                    onChange={(e) => { setReservationId(e.target.value); setPage(1); }}
                    className={fieldCls}
                  />
                </div>
                {/* Room Number */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">Room Number</label>
                  <input
                    type="text" placeholder="e.g. 101" value={roomNumber}
                    onChange={(e) => { setRoomNumber(e.target.value); setPage(1); }}
                    className={fieldCls}
                  />
                </div>
                {/* Status */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">Status</label>
                  <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={fieldCls}>
                    <option value="">All Statuses</option>
                    <option value="Checked Out">✅ Checked Out</option>
                    <option value="Cancelled">❌ Cancelled</option>
                    <option value="No Show">⚪ No Show</option>
                  </select>
                </div>
                {/* Receptionist */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">Receptionist</label>
                  <select value={receptionistId} onChange={(e) => { setReceptionistId(e.target.value); setPage(1); }} className={fieldCls}>
                    <option value="">All Staff</option>
                    {(receptionistsQuery.data ?? []).map((r) => (
                      <option key={r._id} value={r._id}>{r.fullName}</option>
                    ))}
                  </select>
                </div>
                {/* Payment Status */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">Payment Status</label>
                  <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className={fieldCls}>
                    <option value="">All</option>
                    <option value="Settled">Settled</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Open">Open</option>
                    <option value="Void">Void</option>
                  </select>
                </div>
              </div>

              {/* Quick date shortcuts */}
              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
                {[
                  { label: 'Today', days: 0 },
                  { label: 'Last 7 days', days: 7 },
                  { label: 'Last 30 days', days: 30 },
                  { label: 'Last 90 days', days: 90 },
                  { label: 'Last 12 months', days: 365 },
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      const t = TODAY;
                      const f = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
                      setDateFrom(f); setDateTo(t); setPage(1);
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-lime-400 hover:bg-lime-50 hover:text-lime-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-lime-700 dark:hover:bg-lime-950/30 dark:hover:text-lime-300"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── History Table ── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No history records found"
          message="No completed stays match your current filters. Try adjusting the date range or clearing filters."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  {[
                    'Reservation ID', 'Guest', 'Room', 'Type',
                    'Check-in', 'Check-out', 'Nights', 'Amount',
                    'Payment', 'Status', 'Receptionist', '',
                  ].map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                    >
                      <span className="flex items-center gap-1">
                        {col}
                        {['Check-in', 'Check-out', 'Amount'].includes(col) && (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <HistoryRow key={item._id} item={item} onViewDetails={setSelectedId} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Page <span className="font-semibold text-slate-900 dark:text-white">{meta.page}</span> of{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{meta.totalPages}</span>
                {' · '}{meta.total.toLocaleString()} records
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <button
                  disabled={page >= (meta.totalPages ?? 1)}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Detail Drawer ── */}
      <AnimatePresence>
        {selectedId && (
          <DetailDrawer id={selectedId} onClose={() => setSelectedId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon, label, value, color, wide,
}: {
  icon: React.ElementType; label: string; value: string; color: string; wide?: boolean;
}) {
  const colors: Record<string, { bg: string; icon: string; border: string }> = {
    indigo: { bg: 'from-indigo-50 to-white dark:from-indigo-950/30 dark:to-slate-900', icon: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300', border: 'border-indigo-100 dark:border-indigo-900/40' },
    emerald: { bg: 'from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900', icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', border: 'border-emerald-100 dark:border-emerald-900/40' },
    red: { bg: 'from-red-50 to-white dark:from-red-950/30 dark:to-slate-900', icon: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400', border: 'border-red-100 dark:border-red-900/40' },
    amber: { bg: 'from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900', icon: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', border: 'border-amber-100 dark:border-amber-900/40' },
    lime: { bg: 'from-lime-50 to-white dark:from-lime-950/30 dark:to-slate-900', icon: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300', border: 'border-lime-100 dark:border-lime-900/40' },
  };
  const c = colors[color] ?? colors['indigo'];
  return (
    <div className={`flex items-center gap-4 rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${c.bg} ${c.border} ${wide ? 'lg:col-span-1' : ''}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.icon}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

// ─── History Table Row ────────────────────────────────────────────────────────

function HistoryRow({ item, onViewDetails }: { item: HistoryItem; onViewDetails: (id: string) => void }) {
  const nights = calcNights(item.checkIn, item.checkOut);
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
    >
      <td className="px-4 py-3">
        <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
          …{item._id.slice(-8)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="font-semibold text-slate-900 dark:text-white">{item.guestId.fullName}</div>
        {item.guestId.phone && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Phone className="h-2.5 w-2.5" />{item.guestId.phone}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.roomId.roomNumber}</span>
        {item.roomId.floor && (
          <div className="text-[11px] text-slate-400">Floor {item.roomId.floor}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {item.roomId.type}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{fmtDate(item.checkIn)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{fmtDate(item.checkOut)}</td>
      <td className="px-4 py-3">
        <span className="flex h-6 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {nights}
        </span>
      </td>
      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
        {money.format(item.totalAmount)}
      </td>
      <td className="px-4 py-3">
        <PaymentBadge status={item.paidAmount >= item.totalAmount ? 'Settled' : item.paidAmount > 0 ? 'Partially Paid' : 'Open'} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={item.status} />
      </td>
      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
        {item.createdBy?.fullName ?? <span className="text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onViewDetails(item._id)}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 opacity-0 transition group-hover:opacity-100 hover:border-lime-400 hover:bg-lime-50 hover:text-lime-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-lime-700 dark:hover:bg-lime-950/30"
        >
          <ExternalLink className="h-3 w-3" />
          Details
        </button>
      </td>
    </motion.tr>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'guest'>('details');

  const detailQuery = useQuery({
    queryKey: ['history-detail', id],
    queryFn: () => fetchHistoryDetail(id),
  });

  const detail = detailQuery.data;

  const guestHistoryQuery = useQuery({
    queryKey: ['history-guest', detail?.reservation.guestId._id],
    queryFn: () => fetchGuestHistory(detail!.reservation.guestId._id),
    enabled: activeTab === 'guest' && !!detail?.reservation.guestId._id,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Reservation Details</h2>
              {detail && (
                <p className="font-mono text-[11px] text-slate-400">…{id.slice(-12)}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          {[
            { key: 'details' as const, label: 'Details', icon: FileText },
            { key: 'timeline' as const, label: 'Timeline', icon: Clock },
            { key: 'guest' as const, label: 'Guest History', icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
                activeTab === key
                  ? 'border-lime-600 text-lime-700 dark:text-lime-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {detailQuery.isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : !detail ? (
            <div className="p-6">
              <EmptyState title="Could not load details" message="Please try again." />
            </div>
          ) : activeTab === 'details' ? (
            <DetailsTab detail={detail} />
          ) : activeTab === 'timeline' ? (
            <TimelineTab events={detail.timeline} reservation={detail.reservation} />
          ) : (
            <GuestHistoryTab
              guestId={detail.reservation.guestId._id}
              guestData={guestHistoryQuery.data}
              isLoading={guestHistoryQuery.isLoading}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Details Tab ──────────────────────────────────────────────────────────────

function DetailsTab({ detail }: { detail: HistoryDetailResponse }) {
  const { reservation, folio, charges, payments } = detail;
  const guest = reservation.guestId;
  const room = reservation.roomId;
  const nights = calcNights(reservation.checkIn, reservation.checkOut);
  const taxes = folio?.taxTotal ?? 0;
  const discounts = 0; // extend if you add a discounts field
  const grandTotal = (charges.room + charges.restaurant + charges.laundry + charges.other) + taxes - discounts;

  return (
    <div className="space-y-5 p-6">
      {/* Status badge strip */}
      <div className="flex items-center gap-2">
        <StatusBadge status={reservation.status} />
        {folio && <PaymentBadge status={folio.status} />}
        <span className="ml-auto font-mono text-[11px] text-slate-400">
          Created {fmtDate(reservation.createdAt)}
        </span>
      </div>

      {/* Guest Information */}
      <DrawerSection title="Guest Information" icon={User}>
        <DrawerRow label="Full Name" value={guest.fullName} />
        {guest.phone && <DrawerRow label="Phone" value={guest.phone} />}
        {guest.email && <DrawerRow label="Email" value={guest.email} />}
        {guest.nationality && <DrawerRow label="Nationality" value={guest.nationality} />}
        {guest.documentType && <DrawerRow label="Document Type" value={guest.documentType} />}
        {guest.documentNumber && <DrawerRow label="Document Number" value={guest.documentNumber} />}
      </DrawerSection>

      {/* Reservation Information */}
      <DrawerSection title="Reservation Information" icon={BedDouble}>
        <DrawerRow label="Reservation ID" value={<span className="font-mono text-[11px]">{reservation._id}</span>} />
        <DrawerRow label="Booking Date" value={fmtDate(reservation.createdAt)} />
        <DrawerRow label="Check-in" value={fmtDateTime(reservation.checkIn)} />
        <DrawerRow label="Check-out" value={fmtDateTime(reservation.checkOut)} />
        <DrawerRow label="Nights" value={String(nights)} />
        <DrawerRow label="Guests" value={`${reservation.adults} adult${reservation.adults !== 1 ? 's' : ''}${reservation.children > 0 ? `, ${reservation.children} child${reservation.children !== 1 ? 'ren' : ''}` : ''}`} />
        <DrawerRow label="Source" value={reservation.source} />
      </DrawerSection>

      {/* Room Information */}
      <DrawerSection title="Room Information" icon={BedDouble}>
        <DrawerRow label="Room Number" value={room.roomNumber} />
        <DrawerRow label="Room Type" value={room.type} />
        {room.floor !== undefined && <DrawerRow label="Floor" value={String(room.floor)} />}
        {room.name && <DrawerRow label="Room Name" value={room.name} />}
      </DrawerSection>

      {/* Payment Information */}
      <DrawerSection title="Payment Breakdown" icon={CreditCard}>
        <DrawerRow label="Room Charges" value={money.format(charges.room)} />
        <DrawerRow label="Restaurant Charges" value={money.format(charges.restaurant)} />
        <DrawerRow label="Laundry Charges" value={money.format(charges.laundry)} />
        <DrawerRow label="Other Charges" value={money.format(charges.other)} />
        <DrawerRow label="Discounts" value={discounts ? `− ${money.format(discounts)}` : '—'} />
        <DrawerRow label="Taxes" value={taxes ? money.format(taxes) : '—'} />
        <div className="border-t border-slate-200 dark:border-slate-700" />
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-bold text-slate-900 dark:text-white">Grand Total</span>
          <span className="text-sm font-bold text-lime-700 dark:text-lime-400">{money.format(grandTotal || reservation.totalAmount)}</span>
        </div>
        {payments.length > 0 && (
          <>
            <div className="border-t border-slate-200 dark:border-slate-700" />
            {payments.map((pmt) => (
              <DrawerRow
                key={pmt._id}
                label={`${pmt.method}${pmt.reference ? ` · ${pmt.reference}` : ''}`}
                value={<span className="text-emerald-600 dark:text-emerald-400">{money.format(pmt.amount)}</span>}
              />
            ))}
            <DrawerRow
              label="Payment Status"
              value={<PaymentBadge status={folio?.status ?? 'Open'} />}
            />
          </>
        )}
      </DrawerSection>

      {/* Handled By */}
      {reservation.createdBy && (
        <DrawerSection title="Handled By" icon={UserCheck}>
          <DrawerRow label="Receptionist" value={reservation.createdBy.fullName} />
          {reservation.createdBy.role && <DrawerRow label="Role" value={reservation.createdBy.role} />}
        </DrawerSection>
      )}
    </div>
  );
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

function TimelineTab({
  events,
  reservation,
}: {
  events: TimelineEvent[];
  reservation: HistoryItem;
}) {
  // Synthesize core events from reservation if audit trail is sparse
  const syntheticEvents: TimelineEvent[] = [
    {
      _id: 'syn-created',
      timestamp: reservation.createdAt,
      action: 'CREATE_RESERVATION',
      description: `Reservation created for ${reservation.guestId.fullName}`,
      performedBy: reservation.createdBy
        ? { name: reservation.createdBy.fullName, role: reservation.createdBy.role ?? 'Staff' }
        : { name: 'System', role: 'System' },
    },
    ...(reservation.status === 'Checked Out'
      ? [{
          _id: 'syn-checkout',
          timestamp: reservation.checkOut,
          action: 'CHECK_OUT',
          description: `Check-out completed`,
          performedBy: { name: 'System', role: 'System' },
        }]
      : []),
    ...(reservation.status === 'Cancelled'
      ? [{
          _id: 'syn-cancelled',
          timestamp: reservation.checkOut,
          action: 'CANCEL_RESERVATION',
          description: `Reservation cancelled`,
          performedBy: { name: 'System', role: 'System' },
        }]
      : []),
  ];

  const allEvents = events.length > 0
    ? [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : syntheticEvents;

  if (allEvents.length === 0) {
    return (
      <div className="p-6">
        <EmptyState title="No timeline events" message="Activity records for this reservation are not available." />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-6">
          {allEvents.map((event) => {
            const cfg = timelineConfig[event.action] ?? {
              label: event.action,
              Icon: Clock,
              color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
            };
            const { Icon } = cfg;
            return (
              <div key={event._id} className="relative flex gap-4">
                <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 pt-1.5">
                  <p className="font-semibold text-slate-900 dark:text-white">{cfg.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{event.description}</p>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                    <span>{fmtDateTime(event.timestamp)}</span>
                    <span>·</span>
                    <span className="font-medium text-slate-500 dark:text-slate-400">{event.performedBy.name}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                      {event.performedBy.role}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Guest History Tab ────────────────────────────────────────────────────────

function GuestHistoryTab({
  guestId,
  guestData,
  isLoading,
}: {
  guestId: string;
  guestData?: GuestHistoryResponse;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }
  if (!guestData) {
    return (
      <div className="p-6">
        <EmptyState title="No guest history" message="Could not load guest history." />
      </div>
    );
  }

  const { guest, stats, stays } = guestData;

  return (
    <div className="space-y-5 p-6">
      {/* Guest stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Star, label: 'Total Visits', value: String(stats.totalVisits) },
          { icon: TrendingUp, label: 'Total Spent', value: money.format(stats.totalSpent) },
          { icon: Clock, label: 'Avg Stay (nights)', value: String(stats.avgNights) },
          { icon: BedDouble, label: 'Favourite Room', value: stats.favoriteRoom ?? '—' },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400">{label}</p>
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {stats.lastVisit && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Last visit: <span className="font-semibold text-slate-700 dark:text-slate-300">{fmtDate(stats.lastVisit)}</span>
        </p>
      )}

      {/* Previous stays list */}
      <div>
        <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          All Previous Stays
        </h4>
        {stays.length === 0 ? (
          <p className="text-sm text-slate-400">No previous stays.</p>
        ) : (
          <div className="space-y-2">
            {stays.map((stay) => (
              <div
                key={stay._id}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {stay.roomId?.roomNumber ?? '—'} · {stay.roomId?.type ?? ''}
                    </span>
                    <StatusBadge status={stay.status} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {fmtDate(stay.checkIn)} → {fmtDate(stay.checkOut)}
                    {' · '}{calcNights(stay.checkIn, stay.checkOut)} nights
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {money.format(stay.totalAmount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Drawer sub-components ────────────────────────────────────────────────────

function DrawerSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{title}</h4>
      </div>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-slate-50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-800/30">
        {children}
      </div>
    </div>
  );
}

function DrawerRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2">
      <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right text-xs text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}
