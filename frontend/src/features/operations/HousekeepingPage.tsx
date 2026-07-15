import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BedDouble, CheckCircle2, Clock, RefreshCw,
  Sparkles, Wrench, X
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { getProperties } from '../dashboard/dashboardApi';
import { apiClient } from '../../services/apiClient';
import type { ApiResponse, Room } from '../../types/api';

// ─── API ───────────────────────────────────────────────────────────────────────

async function listRoomsForHousekeeping(propertyId?: string) {
  const { data } = await apiClient.get<ApiResponse<Room[]> & { meta: unknown }>(
    '/rooms',
    { params: { propertyId: propertyId || undefined, limit: 100 } }
  );
  return (data as ApiResponse<Room[]> & { data: Room[] }).data;
}

async function updateRoomStatus(input: { id: string; status: Room['status'] }) {
  const { data } = await apiClient.patch<ApiResponse<Room>>(`/rooms/${input.id}`, {
    status: input.status
  });
  return data.data;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Room['status'], { label: string; color: string; dot: string; bg: string }> = {
  Available:   { label: 'Available',   color: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  Occupied:    { label: 'Occupied',    color: 'text-blue-700 dark:text-blue-300',       dot: 'bg-blue-500',     bg: 'bg-blue-50 dark:bg-blue-950/30' },
  Reserved:    { label: 'Reserved',    color: 'text-amber-700 dark:text-amber-300',     dot: 'bg-amber-500',    bg: 'bg-amber-50 dark:bg-amber-950/30' },
  Maintenance: { label: 'Maintenance', color: 'text-red-600 dark:text-red-400',         dot: 'bg-red-500',      bg: 'bg-red-50 dark:bg-red-950/30' },
  Inactive:    { label: 'Inactive',    color: 'text-slate-500 dark:text-slate-400',     dot: 'bg-slate-400',    bg: 'bg-slate-100 dark:bg-slate-800/40' },
};

const NEXT_ACTIONS: Partial<Record<Room['status'], Array<{ status: Room['status']; label: string; icon: React.ElementType; cls: string }>>> = {
  Occupied:    [
    { status: 'Available',   label: 'Mark Clean',       icon: Sparkles, cls: 'bg-lime-700 hover:bg-lime-600 text-white' },
    { status: 'Maintenance', label: 'Flag Maintenance',  icon: Wrench,   cls: 'bg-red-600 hover:bg-red-500 text-white' },
  ],
  Available:   [
    { status: 'Maintenance', label: 'Flag Maintenance',  icon: Wrench,   cls: 'bg-red-600 hover:bg-red-500 text-white' },
  ],
  Maintenance: [
    { status: 'Available',   label: 'Mark Fixed',        icon: CheckCircle2, cls: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
  ],
  Reserved:    [
    { status: 'Maintenance', label: 'Flag Maintenance',  icon: Wrench,   cls: 'bg-red-600 hover:bg-red-500 text-white' },
  ],
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export function HousekeepingPage() {
  const [propertyId, setPropertyId] = useState('');
  const [filterStatus, setFilterStatus] = useState<Room['status'] | 'all'>('all');
  const [confirmTarget, setConfirmTarget] = useState<{ room: Room; status: Room['status']; label: string } | null>(null);
  const queryClient = useQueryClient();

  const propertiesQuery = useQuery({ queryKey: ['properties'], queryFn: getProperties });

  const roomsQuery = useQuery({
    queryKey: ['housekeeping-rooms', propertyId],
    queryFn: () => listRoomsForHousekeeping(propertyId || undefined),
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: updateRoomStatus,
    onSuccess: (updated) => {
      toast.success(`Room ${updated.roomNumber} marked ${updated.status}`);
      setConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ['housekeeping-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: () => toast.error('Could not update room status'),
  });

  const allRooms = roomsQuery.data ?? [];
  const rooms = filterStatus === 'all'
    ? allRooms
    : allRooms.filter((r) => r.status === filterStatus);

  // Counts for summary strip
  const counts = allRooms.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const needsCleaning = (counts['Occupied'] ?? 0);
  const inMaintenance = (counts['Maintenance'] ?? 0);
  const readyRooms    = (counts['Available'] ?? 0);

  return (
    <div>
      <PageHeader
        title="Housekeeping"
        breadcrumb={['Workspace', 'Housekeeping']}
        actions={
          <button
            onClick={() => roomsQuery.refetch()}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-lime-700 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          <option value="">All properties</option>
          {propertiesQuery.data?.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>

        <div className="flex flex-wrap gap-2">
          {(['all', 'Occupied', 'Available', 'Maintenance', 'Reserved'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                filterStatus === s
                  ? 'border-lime-500 bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              {s === 'all' ? 'All rooms' : s}
              {s !== 'all' && counts[s] !== undefined && (
                <span className="ml-1.5 text-[10px] font-bold opacity-70">{counts[s]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      {allRooms.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard icon={Sparkles} label="Need cleaning" value={needsCleaning} color="amber" />
          <SummaryCard icon={CheckCircle2} label="Clean & ready" value={readyRooms} color="emerald" />
          <SummaryCard icon={Wrench} label="In maintenance" value={inMaintenance} color="red" />
        </div>
      )}

      {/* Room grid */}
      {roomsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState title="No rooms found" message="Adjust the filter or select a property." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {rooms.map((room) => {
              const cfg = STATUS_CONFIG[room.status];
              const actions = NEXT_ACTIONS[room.status] ?? [];
              return (
                <motion.div
                  key={room._id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  {/* Status stripe */}
                  <div className={`rounded-t-2xl px-4 py-3 ${cfg.bg}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                        <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <BedDouble className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-lg font-black text-slate-900 dark:text-white">
                      Room {room.roomNumber}
                    </p>
                    {room.name && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{room.name}</p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400 capitalize">
                      {room.type} · sleeps {room.capacity}
                    </p>

                    {/* Action buttons */}
                    {actions.length > 0 && (
                      <div className="mt-4 flex flex-col gap-2">
                        {actions.map((action) => (
                          <button
                            key={action.status}
                            disabled={updateMutation.isPending}
                            onClick={() => setConfirmTarget({ room, status: action.status, label: action.label })}
                            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition disabled:opacity-50 ${action.cls}`}
                          >
                            <action.icon className="h-3.5 w-3.5" />
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {actions.length === 0 && (
                      <p className="mt-3 text-xs text-slate-400">No actions available</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setConfirmTarget(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-50 dark:bg-lime-950/50">
                  <Sparkles className="h-6 w-6 text-lime-700 dark:text-lime-300" />
                </div>
                <button onClick={() => setConfirmTarget(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                {confirmTarget.label}
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Mark <strong>Room {confirmTarget.room.roomNumber}</strong> as{' '}
                <strong>{confirmTarget.status}</strong>?
                {confirmTarget.status === 'Available' && (
                  <span className="block mt-1 text-xs text-slate-400">
                    Room status will update on the reception dashboard immediately.
                  </span>
                )}
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setConfirmTarget(null)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: confirmTarget.room._id, status: confirmTarget.status })}
                  className="inline-flex items-center gap-2 rounded-2xl bg-lime-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-lime-800 disabled:opacity-60"
                >
                  {updateMutation.isPending
                    ? <Clock className="h-4 w-4 animate-spin" />
                    : <CheckCircle2 className="h-4 w-4" />
                  }
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: 'amber' | 'emerald' | 'red'
}) {
  const colors = {
    amber:   'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    red:     'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
