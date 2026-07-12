import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BedDouble,
  CalendarDays,
  DollarSign,
  Loader2,
  Plus,
  Users,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Toolbar } from '../../components/ui/Toolbar';
import type { Guest, Reservation, Room } from '../../types/api';
import { getProperties } from '../dashboard/dashboardApi';
import {
  createReservation,
  listAvailableRooms,
  listGuests,
  listReservations,
} from './operationsApi';

// ─── Display helpers ──────────────────────────────────────────────────────────

const money = new Intl.NumberFormat('en-RW', {
  style: 'currency', currency: 'RWF', maximumFractionDigits: 0,
});

function guestLabel(value: Guest | string) {
  return typeof value === 'string' ? value : value.fullName;
}

function roomLabel(value: Pick<Room, '_id' | 'roomNumber' | 'name' | 'type'> | string) {
  if (typeof value === 'string') return value;
  return value.name ? `${value.roomNumber} · ${value.name}` : `${value.roomNumber} · ${value.type}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-RW', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function nightsBetween(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / 86_400_000));
}

function StatusBadge({ status }: { status: Reservation['status'] }) {
  const styles: Record<Reservation['status'], string> = {
    Pending:       'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
    Confirmed:     'bg-lime-50 text-lime-700 ring-lime-200 dark:bg-lime-950 dark:text-lime-300 dark:ring-lime-900',
    'Checked In':  'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
    'Checked Out': 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400',
    Cancelled:     'bg-red-50 text-red-600 ring-red-200 dark:bg-red-950 dark:text-red-400',
    'No Show':     'bg-orange-50 text-orange-600 ring-orange-200 dark:bg-orange-950 dark:text-orange-400',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${styles[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
      {status}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ReservationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch]         = useState('');
  const [filterProp, setFilterProp] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [formOpen, setFormOpen]     = useState(false);

  const propertiesQuery = useQuery({ queryKey: ['properties'], queryFn: getProperties });

  const reservationsQuery = useQuery({
    queryKey: ['reservations', search, filterProp, filterStatus],
    queryFn: () => listReservations({
      search,
      propertyId: filterProp || undefined,
      status: filterStatus || undefined,
      limit: 100,
    }),
  });

  const mutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      toast.success('Reservation created');
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (err: unknown) => {
      type ErrShape = { response?: { data?: { message?: string } } };
      const msg = (err as ErrShape)?.response?.data?.message ?? 'Could not create reservation';
      toast.error(msg);
    },
  });

  return (
    <div>
      <PageHeader
        title="Reservations"
        breadcrumb={['Workspace', 'Reservations']}
        actions={
          <button
            className="inline-flex items-center gap-2 rounded-2xl bg-lime-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition-colors hover:bg-lime-800"
            onClick={() => setFormOpen((v) => !v)}
          >
            <Plus className="h-4 w-4" /> New reservation
          </button>
        }
      />

      {/* Toolbar */}
      <Toolbar search={search} onSearch={setSearch}>
        <select
          value={filterProp}
          onChange={(e) => setFilterProp(e.target.value)}
          className={selectCls}
        >
          <option value="">All properties</option>
          {propertiesQuery.data?.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={selectCls}
        >
          <option value="">All statuses</option>
          {['Pending','Confirmed','Checked In','Checked Out','Cancelled','No Show'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Toolbar>

      {/* New reservation form */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            key="res-form"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mb-6"
          >
            <ReservationForm
              properties={propertiesQuery.data ?? []}
              isSubmitting={mutation.isPending}
              onClose={() => setFormOpen(false)}
              onSubmit={(input) => mutation.mutate(input)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {reservationsQuery.isLoading ? (
        <Skeleton className="h-72" />
      ) : reservationsQuery.data?.items.length ? (
        <DataTable<Reservation>
          rows={reservationsQuery.data.items}
          columns={[
            {
              header: 'Guest',
              cell: (r) => (
                <span className="font-medium text-slate-900 dark:text-white">
                  {guestLabel(r.guestId)}
                </span>
              ),
            },
            { header: 'Room', cell: (r) => roomLabel(r.roomId) },
            { header: 'Check-in',  cell: (r) => fmtDate(r.checkIn) },
            { header: 'Check-out', cell: (r) => fmtDate(r.checkOut) },
            {
              header: 'Nights',
              cell: (r) => (
                <span className="text-slate-500">{nightsBetween(r.checkIn, r.checkOut)}n</span>
              ),
            },
            { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
            {
              header: 'Source',
              cell: (r) => (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {r.source}
                </span>
              ),
            },
            {
              header: 'Total',
              cell: (r) => (
                <span className="font-semibold text-slate-900 dark:text-white">
                  {money.format(r.totalAmount)}
                </span>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          title="No reservations found"
          message="Create a new reservation or adjust your filters."
        />
      )}
    </div>
  );
}

// ─── Reservation Form ─────────────────────────────────────────────────────────

type CreateReservationInput = Parameters<typeof createReservation>[0];

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

function ReservationForm({
  properties,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  properties: Array<{ _id: string; name: string }>;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: CreateReservationInput) => void;
}) {
  const [propertyId, setPropertyId] = useState(
    properties.length === 1 ? properties[0]._id : ''
  );
  const [guestId,  setGuestId]  = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [roomId,   setRoomId]   = useState('');
  const [checkIn,  setCheckIn]  = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [adults,   setAdults]   = useState(1);
  const [children, setChildren] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paidAmount,  setPaidAmount]  = useState(0);
  const [source, setSource] = useState<CreateReservationInput['source']>('Direct');
  const [status, setStatus] = useState<CreateReservationInput['status']>('Confirmed');
  const [notes, setNotes]   = useState('');

  // Reset guest & room when property changes
  useEffect(() => { setGuestId(''); setGuestSearch(''); setRoomId(''); }, [propertyId]);

  // Reset room when dates change (availability may differ)
  useEffect(() => { setRoomId(''); }, [checkIn, checkOut]);

  // ── Guests for selected property ──
  const guestsQuery = useQuery({
    queryKey: ['form-guests', propertyId, guestSearch],
    queryFn: () => listGuests({ propertyId, search: guestSearch || undefined, limit: 100 }),
    enabled: Boolean(propertyId),
    staleTime: 30_000,
    retry: 1,
  });

  // Show a toast if guest fetch fails so the user knows why the list is empty
  useEffect(() => {
    if (guestsQuery.isError) {
      const err = guestsQuery.error as { response?: { data?: { message?: string } } };
      const msg = err?.response?.data?.message ?? 'Could not load guests for this property';
      toast.error(`Guests: ${msg}`);
    }
  }, [guestsQuery.isError, guestsQuery.error]);

  // ── Available rooms for property + date range ──
  const datesValid = Boolean(propertyId && checkIn && checkOut && checkOut > checkIn);
  const roomsQuery = useQuery({
    queryKey: ['form-rooms', propertyId, checkIn, checkOut],
    queryFn: () => listAvailableRooms({ propertyId, checkIn, checkOut }),
    enabled: datesValid,
    staleTime: 30_000,
  });

  // Auto-fill total when room is selected
  useEffect(() => {
    if (!roomId) return;
    const room = roomsQuery.data?.find((r) => r._id === roomId);
    if (!room) return;
    const nights = nightsBetween(checkIn, checkOut);
    setTotalAmount(room.baseRate * nights);
  }, [roomId, checkIn, checkOut, roomsQuery.data]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyId || !guestId || !roomId) {
      toast.error('Please select a property, guest and room');
      return;
    }
    if (checkOut <= checkIn) {
      toast.error('Check-out must be after check-in');
      return;
    }
    onSubmit({
      propertyId,
      guestId,
      roomId,
      source,
      status,
      checkIn,
      checkOut,
      adults,
      children,
      totalAmount,
      paidAmount,
      notes: notes || undefined,
    });
  }

  const nights = nightsBetween(checkIn, checkOut);
  const selectedRoom = roomsQuery.data?.find((r) => r._id === roomId);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">New Reservation</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Fill in the details to create a booking.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6">

        {/* ── Section 1: Property ── */}
        <FormSection icon={BedDouble} title="Property">
          <Field label="Property" required>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              required
              className={selectCls}
            >
              <option value="">Select property…</option>
              {properties.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </Field>
        </FormSection>

        {/* ── Section 2: Dates ── */}
        <FormSection icon={CalendarDays} title="Stay Dates">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Check-in Date" required>
              <input
                type="date"
                value={checkIn}
                min={today}
                required
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  // push checkout if it's now <= checkin
                  if (e.target.value >= checkOut) {
                    const next = new Date(e.target.value);
                    next.setDate(next.getDate() + 1);
                    setCheckOut(next.toISOString().slice(0, 10));
                  }
                }}
                className={inputCls}
              />
            </Field>
            <Field label="Check-out Date" required>
              <input
                type="date"
                value={checkOut}
                min={checkIn || today}
                required
                onChange={(e) => setCheckOut(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Duration">
              <div className={`${inputCls} flex items-center text-slate-500`}>
                {nights > 0 ? `${nights} night${nights !== 1 ? 's' : ''}` : '—'}
              </div>
            </Field>
          </div>
        </FormSection>

        {/* ── Section 3: Guest + Room ── */}
        <FormSection icon={Users} title="Guest & Room">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Guest */}
            <Field
              label="Guest"
              required
              hint={!propertyId ? 'Select a property first' : undefined}
            >
              {!propertyId ? (
                <div className={`${inputCls} flex items-center text-slate-400`}>
                  Select a property first
                </div>
              ) : guestsQuery.isLoading ? (
                <div className={`${inputCls} flex items-center gap-2 text-slate-400`}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading guests…
                </div>
              ) : guestsQuery.isError ? (
                <div className="flex items-center gap-2">
                  <div className={`${inputCls} flex items-center text-red-500`}>
                    Failed to load guests
                  </div>
                  <button
                    type="button"
                    onClick={() => guestsQuery.refetch()}
                    className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* Search box so receptionists can find guests quickly */}
                  <input
                    type="text"
                    placeholder="Search guests by name or phone…"
                    value={guestSearch}
                    onChange={(e) => { setGuestSearch(e.target.value); setGuestId(''); }}
                    className={inputCls}
                  />
                  <select
                    value={guestId}
                    onChange={(e) => setGuestId(e.target.value)}
                    required
                    size={Math.min((guestsQuery.data?.items.length ?? 0) + 1, 6)}
                    className={`${selectCls} h-auto py-1`}
                  >
                    <option value="">
                      {(guestsQuery.data?.items.length ?? 0) === 0
                        ? guestSearch
                          ? 'No guests match your search'
                          : 'No guests — add a guest first'
                        : '— Select guest —'}
                    </option>
                    {guestsQuery.data?.items.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.fullName}
                        {g.phone ? ` · ${g.phone}` : ''}
                        {g.nationality ? ` · ${g.nationality}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </Field>

            {/* Room */}
            <Field
              label="Room"
              required
              hint={
                !propertyId
                  ? 'Select a property first'
                  : !datesValid
                  ? 'Set valid dates to see available rooms'
                  : undefined
              }
            >
              {!propertyId || !datesValid ? (
                <div className={`${inputCls} flex items-center text-slate-400`}>
                  {!propertyId ? 'Select a property first' : 'Set valid dates first'}
                </div>
              ) : roomsQuery.isLoading ? (
                <div className={`${inputCls} flex items-center gap-2 text-slate-400`}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
                </div>
              ) : (
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  required
                  className={selectCls}
                >
                  <option value="">
                    {(roomsQuery.data?.length ?? 0) === 0
                      ? 'No rooms available for these dates'
                      : 'Select room…'}
                  </option>
                  {roomsQuery.data?.map((r) => (
                    <option key={r._id} value={r._id}>
                      Room {r.roomNumber}
                      {r.name ? ` · ${r.name}` : ''} — {r.type}
                      {r.capacity ? ` (sleeps ${r.capacity})` : ''}
                      {r.baseRate
                        ? ` · ${new Intl.NumberFormat('en-RW').format(r.baseRate)} RWF/night`
                        : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          {/* Room summary card */}
          {selectedRoom && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-start gap-3 rounded-xl border border-lime-200 bg-lime-50 px-4 py-3 dark:border-lime-900 dark:bg-lime-950/30"
            >
              <BedDouble className="mt-0.5 h-4 w-4 shrink-0 text-lime-700 dark:text-lime-400" />
              <div className="text-sm text-lime-800 dark:text-lime-300">
                <span className="font-semibold">
                  Room {selectedRoom.roomNumber}
                  {selectedRoom.name ? ` · ${selectedRoom.name}` : ''}
                </span>
                {' '}— {selectedRoom.type}, sleeps {selectedRoom.capacity}
                {selectedRoom.amenities?.length > 0 && (
                  <span className="ml-1 text-lime-600 dark:text-lime-400">
                    · {selectedRoom.amenities.slice(0, 3).join(', ')}
                    {selectedRoom.amenities.length > 3 ? '…' : ''}
                  </span>
                )}
                <div className="mt-0.5 text-xs text-lime-600 dark:text-lime-500">
                  {money.format(selectedRoom.baseRate)}/night × {nights} night{nights !== 1 ? 's' : ''}
                  {' = '}<span className="font-bold">{money.format(selectedRoom.baseRate * nights)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </FormSection>

        {/* ── Section 4: Booking details ── */}
        <FormSection icon={CalendarDays} title="Booking Details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Booking Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CreateReservationInput['status'])}
                className={selectCls}
              >
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
              </select>
            </Field>
            <Field label="Booking Source">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as CreateReservationInput['source'])}
                className={selectCls}
              >
                <option value="Direct">Direct</option>
                <option value="Phone">Phone</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Lodgify">Lodgify</option>
              </select>
            </Field>
            <Field label="Adults" required>
              <input
                type="number"
                min="1"
                max="20"
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Children">
              <input
                type="number"
                min="0"
                max="20"
                value={children}
                onChange={(e) => setChildren(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
        </FormSection>

        {/* ── Section 5: Financials ── */}
        <FormSection icon={DollarSign} title="Financials">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Total Amount (RWF)" required>
              <input
                type="number"
                min="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
                placeholder="Auto-filled from room rate"
                className={inputCls}
              />
            </Field>
            <Field label="Amount Paid (RWF)">
              <input
                type="number"
                min="0"
                max={totalAmount || undefined}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
          {totalAmount > 0 && (
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Total: <strong className="text-slate-700 dark:text-slate-200">{money.format(totalAmount)}</strong></span>
              <span>Paid: <strong className="text-emerald-600">{money.format(paidAmount)}</strong></span>
              <span>Balance: <strong className="text-amber-600">{money.format(totalAmount - paidAmount)}</strong></span>
            </div>
          )}
          <div className="mt-4">
            <Field label="Internal Notes (optional)">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Guest requested early check-in, quiet room preferred…"
                className={`${inputCls} h-auto resize-none py-3`}
              />
            </Field>
          </div>
        </FormSection>

        {/* Actions */}
        <div className="mt-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !propertyId || !guestId || !roomId}
            className="inline-flex items-center gap-2 rounded-2xl bg-lime-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition-colors hover:bg-lime-800 disabled:opacity-60"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              'Save reservation'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Shared style helpers ─────────────────────────────────────────────────────

const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none ring-lime-700 transition-colors placeholder:text-slate-400 focus:border-lime-600 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

const selectCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none ring-lime-700 transition-colors focus:border-lime-600 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white disabled:cursor-not-allowed disabled:opacity-50';

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-50 text-lime-700 dark:bg-lime-950 dark:text-lime-300">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      </div>
      {children}
    </div>
  );
}
