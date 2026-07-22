/**
 * HousekeepingPage — accessible to: Housekeeper, Owner, Admin, Property Manager
 *
 * Displays all rooms grouped by their current status. Housekeepers can
 * mark a room as Available (cleaned/fixed) or flag it for Maintenance.
 * They cannot change room type, rate, or capacity — those fields are
 * managed by admin roles through the full Rooms page.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BedDouble,
  BedSingle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Wrench,
  X
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../auth/AuthProvider';
import type { Room } from '../../types/api';
import { listRoomsForHousekeeping, updateRoomStatus } from './housekeepingApi';
import { useProperty } from '../../contexts/PropertyContext';

// ─── Status helpers ────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Room['status'], { badge: string; dot: string; label: string }> = {
  Available:   { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', label: 'Available' },
  Occupied:    { badge: 'bg-blue-50 text-blue-700 ring-blue-200',          dot: 'bg-blue-500',    label: 'Occupied' },
  Reserved:    { badge: 'bg-violet-50 text-violet-700 ring-violet-200',    dot: 'bg-violet-500',  label: 'Reserved' },
  Maintenance: { badge: 'bg-amber-50 text-amber-700 ring-amber-200',       dot: 'bg-amber-500',   label: 'Maintenance' },
  Inactive:    { badge: 'bg-slate-100 text-slate-500 ring-slate-200',      dot: 'bg-slate-400',   label: 'Inactive' }
};

// The statuses a housekeeper can transition a room TO
const ALLOWED_TARGET_STATUSES: Room['status'][] = ['Available', 'Maintenance'];

// ─── Component ────────────────────────────────────────────────────────────

export function HousekeepingPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activePropertyId: contextPropertyId } = useProperty();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modalRoom, setModalRoom] = useState<Room | null>(null);

  // Prefer the global property selector (PropertyContext / sessionStorage) so
  // the page respects the same property the user has selected in the nav.
  // Fall back to the value stored on the user record if the selector is empty.
  const propertyId =
    contextPropertyId ||
    user?.activePropertyId ||
    (user?.assignedPropertyIds?.[0] as string | undefined);

  const roomsQuery = useQuery({
    queryKey: ['housekeeping-rooms', propertyId, statusFilter],
    queryFn: () =>
      listRoomsForHousekeeping({
        propertyId,
        status: statusFilter || undefined,
        limit: 100
      }),
    enabled: Boolean(propertyId),
    refetchInterval: 30_000 // auto-refresh every 30 s
  });

  const statusMutation = useMutation({
    mutationFn: updateRoomStatus,
    onSuccess: (updated) => {
      toast.success(`Room ${updated.roomNumber} marked as ${updated.status}`);
      setModalRoom(null);
      queryClient.invalidateQueries({ queryKey: ['housekeeping-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: () => toast.error('Could not update room status')
  });

  const rooms = roomsQuery.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Housekeeping"
        breadcrumb={['Workspace', 'Housekeeping']}
        actions={
          <button
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['housekeeping-rooms'] })}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {/* ── Status filter bar ── */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['', 'Available', 'Occupied', 'Reserved', 'Maintenance', 'Inactive'] as const).map(
          (s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition ${
                statusFilter === s
                  ? 'bg-lime-700 text-white ring-lime-700'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
              }`}
            >
              {s || 'All rooms'}
            </button>
          )
        )}
      </div>

      {/* ── Room grid ── */}
      {roomsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState
          title="No rooms found"
          message={
            statusFilter
              ? `No rooms currently have status "${statusFilter}". Try a different filter.`
              : 'No rooms have been set up for this property yet. Ask an admin to add rooms.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room) => (
            <RoomCard
              key={room._id}
              room={room}
              onUpdateStatus={() => setModalRoom(room)}
            />
          ))}
        </div>
      )}

      {/* ── Status update modal ── */}
      {modalRoom && (
        <StatusModal
          room={modalRoom}
          isSubmitting={statusMutation.isPending}
          onClose={() => setModalRoom(null)}
          onConfirm={(targetStatus, note) =>
            statusMutation.mutate({
              roomId: modalRoom._id,
              status: targetStatus,
              maintenanceNote: note
            })
          }
        />
      )}
    </div>
  );
}

// ─── Room card ────────────────────────────────────────────────────────────

function RoomCard({
  room,
  onUpdateStatus
}: {
  room: Room;
  onUpdateStatus: () => void;
}) {
  const style = STATUS_STYLES[room.status];
  const canUpdate = ALLOWED_TARGET_STATUSES.some((s) => s !== room.status);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xl font-bold text-slate-950 dark:text-white">
            {room.roomNumber}
          </p>
          {room.name && (
            <p className="mt-0.5 text-sm text-slate-500">{room.name}</p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          {room.capacity > 1 ? (
            <BedDouble className="h-5 w-5 text-slate-500" />
          ) : (
            <BedSingle className="h-5 w-5 text-slate-500" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>{room.type}</span>
        <span>·</span>
        <span>{room.capacity} guest{room.capacity !== 1 ? 's' : ''}</span>
      </div>

      <span
        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${style.badge}`}
      >
        <span className={`mr-1.5 mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
        {style.label}
      </span>

      {canUpdate && (
        <button
          onClick={onUpdateStatus}
          className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-lime-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-lime-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Update status
        </button>
      )}
    </div>
  );
}

// ─── Status update modal ──────────────────────────────────────────────────

function StatusModal({
  room,
  isSubmitting,
  onClose,
  onConfirm
}: {
  room: Room;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (status: Room['status'], note?: string) => void;
}) {
  const [targetStatus, setTargetStatus] = useState<Room['status']>(
    // Default to Available when coming from Maintenance/cleaning, else Maintenance
    room.status === 'Maintenance' ? 'Available' : 'Maintenance'
  );
  const [note, setNote] = useState('');

  const isMakingAvailable = targetStatus === 'Available';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                isMakingAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {isMakingAvailable ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <Wrench className="h-5 w-5" />
              )}
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">
              Update Room {room.roomNumber}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Current status:{' '}
              <span className="font-semibold">{room.status}</span>
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status picker */}
        <div className="mb-4 grid gap-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            New status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ALLOWED_TARGET_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTargetStatus(s)}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                  targetStatus === s
                    ? s === 'Available'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {s === 'Available' ? '✓ Mark Available' : '⚠ Flag Maintenance'}
              </button>
            ))}
          </div>
        </div>

        {/* Optional note */}
        <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Note <span className="font-normal text-slate-400">(optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={
              targetStatus === 'Available'
                ? 'e.g. Room cleaned, fresh linen replaced'
                : 'e.g. Broken shower — awaiting plumber'
            }
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none ring-lime-700 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
          />
        </label>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onConfirm(targetStatus, note || undefined)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition disabled:opacity-60 ${
              isMakingAvailable
                ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700'
                : 'bg-amber-600 shadow-amber-600/20 hover:bg-amber-700'
            }`}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
