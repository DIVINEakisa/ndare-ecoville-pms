import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  DollarSign,
  Loader2,
  Plus,
  Users,
  X
} from 'lucide-react';
import { useState } from 'react';
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
  listGuests,
  listReservations,
  listRooms
} from './operationsApi';

// ─── display helpers ────────────────────────────────────────────────────────

const money = new Intl.NumberFormat('en-RW', {
  style: 'currency',
  currency: 'RWF',
  maximumFractionDigits: 0
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
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function StatusBadge({ status }: { status: Reservation['status'] }) {
  const styles: Record<Reservation['status'], string> = {
    Pending:      'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
    Confirmed:    'bg-lime-50 text-lime-700 ring-lime-200 dark:bg-lime-950 dark:text-lime-300 dark:ring-lime-900',
    'Checked In': 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
    'Checked Out':'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400',
    Cancelled:    'bg-red-50 text-red-600 ring-red-200 dark:bg-red-950 dark:text-red-400',
    'No Show':    'bg-orange-50 text-orange-600 ring-orange-200 dark:bg-orange-950 dark:text-orange-400'
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${styles[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
      {status}
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ReservationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch]       = useState('');
  const [filterProp, setFilterProp] = useState('');   // toolbar property filter
  const [formOpen, setFormOpen]   = useState(false);

  const propertiesQuery = useQuery({ queryKey: ['properties'], queryFn: getProperties });

  const reservationsQuery = useQuery({
    queryKey: ['reservations', search, filterProp],
    queryFn: () => listReservations({ search, propertyId: filterProp, limit: 50 })
  });

  const mutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      toast.success('Reservation created successfully');
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation-rooms'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Could not create reservation';
      toast.error(msg);
    }
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
            <Plus className="h-4 w-4" />
            New reservation
          </button>
        }
      />

      {/* ── Toolbar ── */}
      <Toolbar search={search} onSearch={setSearch}>
        <select
          value={filterProp}
          onChange={(e) => setFilterProp(e.target.value)}
          className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none ring-lime-700 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
        >
          <option value="">All properties</option>
          {propertiesQuery.data?.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </Toolbar>

      {/* ── New Reservation slide-down form ── */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            key="reservation-form"
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

      {/* ── Reservations table ── */}
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
              )
            },
            {
              header: 'Room',
              cell: (r) => roomLabel(r.roomId)
            },
            {
              header: 'Check-in',
              cell: (r) => fmtDate(r.checkIn)
            },
            {
              header: 'Check-out',
              cell: (r) => fmtDate(r.checkOut)
            },
            {
              header: 'Status',
              cell: (r) => <StatusBadge status={r.status} />
            },
            {
              header: 'Source',
              cell: (r) => (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {r.source}
                </span>
              )
            },
            {
              header: 'Total',
              cell: (r) => (
                <span className="font-semibold text-slate-900 dark:text-white">
                  {money.format(r.totalAmount)}
                </span>
              )
            }
          ]}
        />
      ) : (
        <EmptyState
          title="No reservations found"
          message="Reservations will appear here after booking or Lodgify sync."
        />
      )}
    </div>
  );
}

// ─── Reservation form ─────────────────────────────────────────────────────────

type CreateReservationInput = Parameters<typeof createReservation>[0];

function ReservationForm({
  properties,
  isSubmitting,
  onClose,
  onSubmit
}: {
  properties: Array<{ _id: string; name: string }>;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: CreateReservationInput) => void;
}) {
  // Form-local property selection drives both Guest and Room dropdowns
  const [formPropertyId, setFormPropertyId] = useState(
    properties.length === 1 ? properties[0]._id : ''
  );

  // Fetch guests scoped to the selected property
  const guestsQuery = useQuery({
    queryKey: ['reservation-guests', formPropertyId],
    queryFn: () => listGuests({ propertyId: formPropertyId, limit: 200 }),
    enabled: Boolean(formPropertyId)
  });

  // Fetch only Available rooms for the selected property
  const roomsQuery = useQuery({
    queryKey: ['reservation-rooms', formPropertyId],
    queryFn: () => listRooms({ propertyId: formPropertyId, status: 'Available', limit: 200 }),
    enabled: Boolean(formPropertyId)
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      propertyId:  String(fd.get('propertyId')),
      guestId:     String(fd.get('guestId')),
      roomId:      String(fd.get('roomId')),
      source:      String(fd.get('source')) as CreateReservationInput['source'],
      status:      String(fd.get('status')) as CreateReservationInput['status'],
      checkIn:     String(fd.get('checkIn')),
      checkOut:    String(fd.get('checkOut')),
      adults:      Number(fd.get('adults')),
      children:    Number(fd.get('children')),
      totalAmount: Number(fd.get('totalAmount')),
      paidAmount:  Number(fd.get('paidAmount')),
      notes:       String(fd.get('notes') ?? '')
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
      {/* Form header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">New Reservation</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Fill in the details below to create a booking.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close form"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* ── Section 1: Property / Guest / Room ── */}
        <FormSection icon={Users} title="Booking Parties">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Property" required>
              <select
                name="propertyId"
                required
                value={formPropertyId}
                onChange={(e) => setFormPropertyId(e.target.value)}
                className={selectCls}
              >
                <option value="">Select property…</option>
                {properties.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </Field>

            <Field
              label="Guest"
              required
              hint={!formPropertyId ? 'Select a property first' : undefined}
            >
              <select
                name="guestId"
                required
                disabled={!formPropertyId || guestsQuery.isLoading}
                className={selectCls}
              >
                <option value="">
                  {guestsQuery.isLoading
                    ? 'Loading guests…'
                    : !formPropertyId
                    ? 'Select property first'
                    : guestsQuery.data?.items.length === 0
                    ? 'No guests found'
                    : 'Select guest…'}
                </option>
                {guestsQuery.data?.items.map((g) => (
                  <option key={g._id} value={g._id}>{g.fullName}</option>
                ))}
              </select>
            </Field>

            <Field
              label="Room (Available only)"
              required
              hint={!formPropertyId ? 'Select a property first' : undefined}
            >
              <select
                name="roomId"
                required
                disabled={!formPropertyId || roomsQuery.isLoading}
                className={selectCls}
              >
                <option value="">
                  {roomsQuery.isLoading
                    ? 'Loading rooms…'
                    : !formPropertyId
                    ? 'Select property first'
                    : roomsQuery.data?.items.length === 0
                    ? 'No available rooms'
                    : 'Select room…'}
                </option>
                {roomsQuery.data?.items.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.roomNumber}
                    {r.name ? ` · ${r.name}` : ''} — {r.type}
                    {r.baseRate ? ` (${new Intl.NumberFormat('en-RW').format(r.baseRate)} RWF/night)` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </FormSection>

        {/* ── Section 2: Dates / Status / Source ── */}
        <FormSection icon={CalendarDays} title="Stay Details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Check-in Date" required>
              <input
                name="checkIn"
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                className={inputCls}
              />
            </Field>

            <Field label="Check-out Date" required>
              <input
                name="checkOut"
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                className={inputCls}
              />
            </Field>

            <Field label="Booking Status">
              <select name="status" className={selectCls} defaultValue="Confirmed">
                <option>Confirmed</option>
                <option>Pending</option>
              </select>
            </Field>

            <Field label="Booking Source">
              <select name="source" className={selectCls} defaultValue="Direct">
                <option>Direct</option>
                <option>Phone</option>
                <option>Walk-in</option>
                <option>Lodgify</option>
              </select>
            </Field>
          </div>
        </FormSection>

        {/* ── Section 3: Guests & Financials ── */}
        <FormSection icon={DollarSign} title="Guests & Financials">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Number of Adults" required>
              <input
                name="adults"
                type="number"
                required
                min="1"
                defaultValue="1"
                placeholder="e.g. 2"
                className={inputCls}
              />
            </Field>

            <Field label="Number of Children">
              <input
                name="children"
                type="number"
                min="0"
                defaultValue="0"
                placeholder="e.g. 0"
                className={inputCls}
              />
            </Field>

            <Field label="Total Price (RWF)" required>
              <input
                name="totalAmount"
                type="number"
                required
                min="0"
                placeholder="e.g. 150000"
                className={inputCls}
              />
            </Field>

            <Field label="Amount Paid (RWF)">
              <input
                name="paidAmount"
                type="number"
                min="0"
                defaultValue="0"
                placeholder="e.g. 50000"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Internal Notes (optional)">
              <textarea
                name="notes"
                rows={2}
                placeholder="e.g. Guest requested early check-in, ground floor preferred…"
                className={`${inputCls} resize-none`}
              />
            </Field>
          </div>
        </FormSection>

        {/* ── Actions ── */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
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
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-lime-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition-colors hover:bg-lime-800 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save reservation'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Small layout helpers ─────────────────────────────────────────────────────

const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none ring-lime-700 transition-colors placeholder:text-slate-400 focus:border-lime-600 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

const selectCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none ring-lime-700 transition-colors focus:border-lime-600 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white disabled:cursor-not-allowed disabled:opacity-50';

function Field({
  label,
  required,
  hint,
  children
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
      {hint && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
}

function FormSection({
  icon: Icon,
  title,
  children
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
