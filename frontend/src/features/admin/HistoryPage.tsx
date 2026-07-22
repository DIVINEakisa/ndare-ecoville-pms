import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  BedDouble,
  CalendarDays,
  CheckCircle,
  ChefHat,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CreditCard,
  Filter,
  History,
  KeyRound,
  LogIn,
  LogOut,
  Package,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Utensils,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { apiClient } from '../../services/apiClient';
import type { ApiResponse, PaginationMeta } from '../../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditLog = {
  _id: string;
  timestamp: string;
  action: string;
  resource: string;
  description: string;
  ipAddress?: string;
  performedBy: {
    userId?: string;
    name: string;
    role: string;
    email?: string;
  };
  metadata?: Record<string, unknown>;
};

type AuditMeta = {
  actions: string[];
  roles: string[];
};

// ─── API ──────────────────────────────────────────────────────────────────────

async function listAuditLogs(params: Record<string, string | number | undefined>) {
  const clean: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') clean[k] = v;
  }
  const { data } = await apiClient.get<ApiResponse<AuditLog[]> & { meta: PaginationMeta }>(
    '/audit',
    { params: clean }
  );
  return { logs: data.data, meta: data.meta };
}

async function getAuditMeta() {
  const { data } = await apiClient.get<ApiResponse<AuditMeta>>('/audit/meta');
  return data.data;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const money = new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 });

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-RW', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-RW', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Action config ────────────────────────────────────────────────────────────

type ActionConfig = {
  Icon: React.ElementType;
  iconBg: string;
  badgeBg: string;
  label: string;
  group: string;
};

const ACTION_CONFIG: Record<string, ActionConfig> = {
  // Auth
  LOGIN_SUCCESS:     { Icon: LogIn,      iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', label: 'Login',          group: 'auth' },
  LOGIN_FAILED:      { Icon: AlertTriangle, iconBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',              badgeBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',              label: 'Login Failed',   group: 'auth' },
  LOGOUT:            { Icon: LogOut,     iconBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',         badgeBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',         label: 'Logout',         group: 'auth' },
  PASSWORD_RESET:    { Icon: KeyRound,   iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',        badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',        label: 'Password Reset', group: 'auth' },
  // Users
  CREATE_USER:       { Icon: UserPlus,   iconBg: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',            badgeBg: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',            label: 'User Created',   group: 'user' },
  UPDATE_USER:       { Icon: UserCheck,  iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',                badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',                label: 'User Updated',   group: 'user' },
  DEACTIVATE_USER:   { Icon: UserX,      iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',    badgeBg: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',    label: 'Deactivated',    group: 'user' },
  REACTIVATE_USER:   { Icon: UserCheck,  iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',label: 'Reactivated',    group: 'user' },
  // Reservations
  CREATE_RESERVATION: { Icon: BedDouble, iconBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',    badgeBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',    label: 'Reservation',    group: 'reservation' },
  UPDATE_RESERVATION: { Icon: BedDouble, iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',                badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',                label: 'Updated Res.',   group: 'reservation' },
  CANCEL_RESERVATION: { Icon: BedDouble, iconBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',                badgeBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',                label: 'Cancelled Res.', group: 'reservation' },
  CHECK_IN:           { Icon: LogIn,     iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', label: 'Check-In',       group: 'reservation' },
  CHECK_OUT:          { Icon: LogOut,    iconBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',         badgeBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',         label: 'Check-Out',      group: 'reservation' },
  // Rooms
  CREATE_ROOM:       { Icon: BedDouble,  iconBg: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',    badgeBg: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',    label: 'Room Created',   group: 'room' },
  UPDATE_ROOM:       { Icon: BedDouble,  iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',                badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',                label: 'Room Updated',   group: 'room' },
  DELETE_ROOM:       { Icon: Trash2,     iconBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',                badgeBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',                label: 'Room Deleted',   group: 'room' },
  // Guests
  CREATE_GUEST:      { Icon: UserPlus,   iconBg: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',            badgeBg: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',            label: 'Guest Created',  group: 'guest' },
  UPDATE_GUEST:      { Icon: UserCheck,  iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',                badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',                label: 'Guest Updated',  group: 'guest' },
  DELETE_GUEST:      { Icon: UserX,      iconBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',                badgeBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',                label: 'Guest Deleted',  group: 'guest' },
  // Folios & Payments
  CREATE_FOLIO:      { Icon: Receipt,    iconBg: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',             badgeBg: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',             label: 'Folio Created',  group: 'payment' },
  ADD_FOLIO_ITEM:    { Icon: Receipt,    iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',        badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',        label: 'Folio Item',     group: 'payment' },
  SETTLE_PAYMENT:    { Icon: CreditCard, iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',label: 'Payment',        group: 'payment' },
  // Menu
  CREATE_MENU_CATEGORY: { Icon: ChefHat,  iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400', badgeBg: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400', label: 'Menu Category',  group: 'restaurant' },
  CREATE_MENU_ITEM:     { Icon: Utensils, iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',    badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',    label: 'Menu Item',      group: 'restaurant' },
  UPDATE_MENU_ITEM:     { Icon: Utensils, iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',            badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',            label: 'Menu Updated',   group: 'restaurant' },
  DELETE_MENU_ITEM:     { Icon: Trash2,   iconBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',            badgeBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',            label: 'Menu Deleted',   group: 'restaurant' },
  // Orders
  CREATE_ORDER:         { Icon: ShoppingCart, iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', label: 'Order Created',  group: 'restaurant' },
  UPDATE_ORDER_STATUS:  { Icon: RefreshCw,    iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',         badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',         label: 'Order Updated',  group: 'restaurant' },
  CANCEL_ORDER:         { Icon: X,            iconBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',         badgeBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',         label: 'Order Cancelled',group: 'restaurant' },
  // Inventory
  CREATE_INVENTORY_ITEM: { Icon: Package, iconBg: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',         badgeBg: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',         label: 'Inventory Item', group: 'inventory' },
  UPDATE_STOCK:          { Icon: Package, iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',             badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',             label: 'Stock Updated',  group: 'inventory' },
  CREATE_REQUISITION:    { Icon: Package, iconBg: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300', badgeBg: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300', label: 'Requisition',    group: 'inventory' },
  APPROVE_REQUISITION:   { Icon: CheckCircle, iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', label: 'Approved Req.',  group: 'inventory' },
  // Settings
  UPDATE_SETTINGS:       { Icon: Settings, iconBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', badgeBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', label: 'Settings',       group: 'settings' },
  // Generic
  CREATE: { Icon: Activity, iconBg: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',  badgeBg: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',  label: 'Created', group: 'other' },
  UPDATE: { Icon: RefreshCw,iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',    badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',    label: 'Updated', group: 'other' },
  DELETE: { Icon: Trash2,   iconBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',    badgeBg: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',    label: 'Deleted', group: 'other' },
};

const DEFAULT_CONFIG: ActionConfig = {
  Icon: Activity,
  iconBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  badgeBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  label: 'Event',
  group: 'other',
};

function getConfig(action: string): ActionConfig {
  return ACTION_CONFIG[action] ?? DEFAULT_CONFIG;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY     = new Date().toISOString().slice(0, 10);
const WEEK_AGO  = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

const GROUP_LABELS: Record<string, string> = {
  auth: 'Authentication',
  user: 'User Management',
  reservation: 'Reservations & Check-ins',
  room: 'Rooms',
  guest: 'Guests',
  payment: 'Payments & Folios',
  restaurant: 'Restaurant',
  inventory: 'Inventory',
  settings: 'Settings',
  other: 'Other',
};

const QUICK_DATES = [
  { label: 'Today',       days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

const fieldCls =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ' +
  'ring-lime-700 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HistoryPage() {
  const [dateFrom, setDateFrom] = useState(WEEK_AGO);
  const [dateTo, setDateTo]     = useState(TODAY);
  const [search, setSearch]     = useState('');
  const [action, setAction]     = useState('');
  const [role, setRole]         = useState('');
  const [page, setPage]         = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const logsQuery = useQuery({
    queryKey: ['audit-logs', dateFrom, dateTo, search, action, role, page],
    queryFn: () => listAuditLogs({ dateFrom, dateTo, search, action, role, page, limit: 50 }),
  });

  const metaQuery = useQuery({
    queryKey: ['audit-meta'],
    queryFn: getAuditMeta,
    staleTime: Infinity,
  });

  const logs = logsQuery.data?.logs ?? [];
  const pagination = logsQuery.data?.meta;
  const isLoading = logsQuery.isLoading;

  // Group by calendar day
  const grouped = logs.reduce<Record<string, AuditLog[]>>((acc, log) => {
    const day = fmtDate(log.timestamp);
    if (!acc[day]) acc[day] = [];
    acc[day].push(log);
    return acc;
  }, {});

  // Summary stats
  const stats = {
    total: pagination?.total ?? logs.length,
    logins: logs.filter((l) => l.action === 'LOGIN_SUCCESS').length,
    payments: logs.filter((l) => l.action === 'SETTLE_PAYMENT').length,
    checkIns: logs.filter((l) => l.action === 'CHECK_IN').length,
  };

  function resetFilters() {
    setDateFrom(WEEK_AGO);
    setDateTo(TODAY);
    setSearch('');
    setAction('');
    setRole('');
    setPage(1);
  }

  const hasFilters = search || action || role;

  return (
    <div>
      <PageHeader
        title="Audit History"
        breadcrumb={['Workspace', 'History']}
        actions={
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <History className="h-4 w-4 text-lime-700" />
            {stats.total.toLocaleString()} records
          </div>
        }
      />

      {/* ── Stats Strip ── */}
      {!isLoading && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            { icon: Activity,    label: 'Total Events',  value: stats.total.toLocaleString(),  color: 'slate' },
            { icon: LogIn,       label: 'Logins',        value: stats.logins.toLocaleString(),  color: 'emerald' },
            { icon: CreditCard,  label: 'Payments',      value: stats.payments.toLocaleString(), color: 'lime' },
            { icon: BedDouble,   label: 'Check-Ins',     value: stats.checkIns.toLocaleString(), color: 'sky' },
          ].map(({ icon: Icon, label, value, color }) => (
            <StatCard key={label} icon={Icon} label={label} value={value} color={color as 'slate' | 'emerald' | 'lime' | 'sky'} />
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Filters</span>
          </div>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* From */}
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className={`${fieldCls} pl-9`}
            />
          </div>
          {/* To */}
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className={`${fieldCls} pl-9`}
            />
          </div>
          {/* Action */}
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className={fieldCls}
          >
            <option value="">All actions</option>
            {Object.entries(GROUP_LABELS).map(([group, groupLabel]) => {
              const groupActions = (metaQuery.data?.actions ?? []).filter(
                (a) => (ACTION_CONFIG[a]?.group ?? 'other') === group
              );
              if (!groupActions.length) return null;
              return (
                <optgroup key={group} label={groupLabel}>
                  {groupActions.map((a) => (
                    <option key={a} value={a}>{ACTION_CONFIG[a]?.label ?? a}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          {/* Role */}
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
            className={fieldCls}
          >
            <option value="">All roles</option>
            {(metaQuery.data?.roles ?? []).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, user…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`${fieldCls} pl-9`}
            />
          </div>
        </div>

        {/* Quick shortcuts */}
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_DATES.map(({ label, days }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                const t = new Date().toISOString().slice(0, 10);
                const f = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
                setDateFrom(f); setDateTo(t); setPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-lime-400 hover:bg-lime-50 hover:text-lime-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-lime-700 dark:hover:bg-lime-950/30 dark:hover:text-lime-300"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeline ── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState title="No audit records found" message="Try expanding the date range or removing filters." />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([day, dayLogs]) => (
            <DayGroup key={day} day={day} logs={dayLogs} onSelect={setSelectedLog} />
          ))}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page <span className="font-semibold text-slate-900 dark:text-white">{pagination.page}</span> of{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{pagination.totalPages}</span>
                {' '}·{' '}{pagination.total.toLocaleString()} total records
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  disabled={page >= (pagination.totalPages ?? 1)}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selectedLog && (
          <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Day Group ────────────────────────────────────────────────────────────────

function DayGroup({ day, logs, onSelect }: { day: string; logs: AuditLog[]; onSelect: (l: AuditLog) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="mb-3 flex w-full items-center gap-3"
      >
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {day}
        </span>
        <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-bold text-lime-700 dark:bg-lime-950 dark:text-lime-300">
          {logs.length}
        </span>
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
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
            {logs.map((log) => <LogRow key={log._id} log={log} onSelect={onSelect} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Log Row ──────────────────────────────────────────────────────────────────

function LogRow({ log, onSelect }: { log: AuditLog; onSelect: (l: AuditLog) => void }) {
  const cfg = getConfig(log.action);
  const { Icon } = cfg;

  return (
    <motion.button
      layout
      type="button"
      onClick={() => onSelect(log)}
      className="flex w-full items-start gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-lime-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-lime-700"
    >
      {/* Icon */}
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.badgeBg}`}>
            {cfg.label}
          </span>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{log.description}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">{log.performedBy.name}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {log.performedBy.role}
            </span>
          </span>
          {log.resource && (
            <span className="truncate max-w-[160px] rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-slate-800">
              {log.resource}
            </span>
          )}
          {log.ipAddress && <span>{log.ipAddress}</span>}
        </div>
      </div>

      {/* Time */}
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{timeAgo(log.timestamp)}</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          {new Date(log.timestamp).toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </motion.button>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function LogDetailModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const cfg = getConfig(log.action);
  const { Icon } = cfg;
  const meta = log.metadata && Object.keys(log.metadata).length > 0 ? log.metadata : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${cfg.iconBg}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.badgeBg}`}>{cfg.label}</span>
                <span className="font-mono text-[10px] text-slate-400">{log.action}</span>
              </div>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{log.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Performed by */}
          <DetailSection title="Performed By">
            <DetailRow label="Name"  value={log.performedBy.name} />
            <DetailRow label="Role"  value={log.performedBy.role} />
            {log.performedBy.email && <DetailRow label="Email" value={log.performedBy.email} />}
            {log.performedBy.userId && (
              <DetailRow label="User ID" value={<span className="font-mono text-xs">{log.performedBy.userId}</span>} />
            )}
          </DetailSection>

          {/* Event details */}
          <DetailSection title="Event Details">
            <DetailRow label="Timestamp" value={fmtDateTime(log.timestamp)} />
            <DetailRow label="Resource"  value={<span className="font-mono text-xs break-all">{log.resource}</span>} />
            {log.ipAddress && <DetailRow label="IP Address" value={log.ipAddress} />}
          </DetailSection>

          {/* Metadata */}
          {meta && (
            <DetailSection title="Additional Data">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {JSON.stringify(meta, null, 2)}
                </pre>
              </div>
            </DetailSection>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, color
}: { icon: React.ElementType; label: string; value: string; color: 'slate' | 'emerald' | 'lime' | 'sky' }) {
  const colors: Record<string, string> = {
    slate:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    lime:    'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',
    sky:     'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
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

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{title}</h4>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-slate-50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-800/40">
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2">
      <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right text-xs text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}
