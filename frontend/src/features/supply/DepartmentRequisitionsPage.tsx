/**
 * DepartmentRequisitionsPage — visible to: Department Staff role
 *
 * A focused requisition workspace. Department Staff can:
 *   1. Submit new stock requests via a clear multi-item form
 *   2. Track the live status of all their own requests
 *
 * Approve / Reject / Receive actions are intentionally absent —
 * those are manager-level actions handled in the main RequisitionsPage.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  ClipboardList,
  Clock,
  Loader2,
  Package,
  Plus,
  Trash2,
  X,
  XCircle
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../auth/AuthProvider';
import { useProperty } from '../../contexts/PropertyContext';
import { createRequisition, listInventory, listRequisitions } from './supplyApi';
import type { Requisition } from '../../types/api';

// ─── Helpers ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Requisition['status'],
  { label: string; icon: React.ElementType; badge: string; dot: string }
> = {
  Pending: {
    label: 'Pending',
    icon: Clock,
    badge: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
    dot: 'bg-amber-400'
  },
  Approved: {
    label: 'Approved',
    icon: CheckCircle,
    badge: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
    dot: 'bg-blue-500'
  },
  Rejected: {
    label: 'Rejected',
    icon: XCircle,
    badge: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800',
    dot: 'bg-red-500'
  },
  Received: {
    label: 'Received',
    icon: CheckCircle,
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
    dot: 'bg-emerald-500'
  }
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-RW', { dateStyle: 'medium' });

type LineItem = { inventoryItemId: string; quantity: number };

// ─── Page ──────────────────────────────────────────────────────────────────

export function DepartmentRequisitionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activePropertyId: contextPropertyId } = useProperty();

  const propertyId =
    contextPropertyId ||
    user?.activePropertyId ||
    (user?.assignedPropertyIds?.[0] as string | undefined);

  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Requisition['status'] | ''>('');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ inventoryItemId: '', quantity: 1 }]);

  // ── Data queries ──
  const inventoryQuery = useQuery({
    queryKey: ['dept-inventory', propertyId],
    queryFn: () => listInventory({ propertyId: propertyId || undefined, limit: 200 }),
    enabled: Boolean(propertyId),
    staleTime: 60_000
  });

  const requisitionsQuery = useQuery({
    queryKey: ['dept-requisitions', propertyId, statusFilter],
    queryFn: () =>
      listRequisitions({
        propertyId: propertyId || undefined,
        status: statusFilter || undefined,
        limit: 50
      }),
    enabled: Boolean(propertyId),
    refetchInterval: 30_000 // auto-refresh so status updates appear quickly
  });

  // Always fetch all statuses for accurate summary counts — independent of the active filter
  const allRequisitionsQuery = useQuery({
    queryKey: ['dept-requisitions-all', propertyId],
    queryFn: () => listRequisitions({ propertyId: propertyId || undefined, limit: 200 }),
    enabled: Boolean(propertyId),
    refetchInterval: 30_000
  });

  // ── Submit mutation ──
  const createMutation = useMutation({
    mutationFn: createRequisition,
    onSuccess: () => {
      toast.success('Requisition submitted — waiting for approval');
      setFormOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['dept-requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Could not submit requisition. Please try again.')
  });

  function resetForm() {
    setDepartment('');
    setNotes('');
    setLineItems([{ inventoryItemId: '', quantity: 1 }]);
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { inventoryItemId: '', quantity: 1 }]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyId) {
      toast.error('No property selected');
      return;
    }
    const validItems = lineItems.filter((item) => item.inventoryItemId && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    createMutation.mutate({
      propertyId,
      department,
      notes: notes || undefined,
      items: validItems
    });
  }

  const inventoryItems = inventoryQuery.data?.items ?? [];
  const requisitions = requisitionsQuery.data?.items ?? [];

  // Counts always come from the unfiltered list so summary bar stays accurate
  // regardless of which status filter is active
  const allReqs = allRequisitionsQuery.data?.items ?? [];
  const counts = {
    Pending:  allReqs.filter((r) => r.status === 'Pending').length,
    Approved: allReqs.filter((r) => r.status === 'Approved').length,
    Received: allReqs.filter((r) => r.status === 'Received').length,
    Rejected: allReqs.filter((r) => r.status === 'Rejected').length
  };

  return (
    <div>
      <PageHeader
        title="My Requisitions"
        breadcrumb={['Workspace', 'Requisitions']}
        actions={
          <button
            className="flex items-center gap-2 rounded-2xl bg-lime-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition hover:bg-lime-800"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New request
          </button>
        }
      />

      {/* ── Status summary bar ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(STATUS_CONFIG) as Requisition['status'][]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                statusFilter === s
                  ? 'border-lime-300 bg-lime-50 dark:border-lime-800 dark:bg-lime-950/40'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} />
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">{cfg.label}</p>
                <p className="text-lg font-bold text-slate-950 dark:text-white">{counts[s]}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Requisitions list ── */}
      {requisitionsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : requisitions.length === 0 ? (
        <EmptyState
          title={statusFilter ? `No ${statusFilter.toLowerCase()} requisitions` : 'No requisitions yet'}
          message={
            statusFilter
              ? 'Try clearing the status filter to see all your requests.'
              : 'Submit your first stock request using the "New request" button above.'
          }
        />
      ) : (
        <div className="space-y-3">
          {requisitions.map((req) => (
            <RequisitionCard key={req._id} requisition={req} />
          ))}
        </div>
      )}

      {/* ── New request modal ── */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-50 text-lime-800 dark:bg-lime-950/60">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-950 dark:text-white">New stock request</p>
                  <p className="text-xs text-slate-500">Submit items for approval</p>
                </div>
              </div>
              <button
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                onClick={() => { setFormOpen(false); resetForm(); }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Department */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Department <span className="text-red-500">*</span>
                </span>
                <input
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Housekeeping, F&B, Maintenance"
                  className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none ring-lime-700 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </label>

              {/* Line items */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Items <span className="text-red-500">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-lime-700 transition hover:bg-lime-50 dark:hover:bg-lime-950/40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add item
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((line, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        required
                        value={line.inventoryItemId}
                        onChange={(e) => updateLineItem(index, 'inventoryItemId', e.target.value)}
                        className="h-10 flex-1 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none ring-lime-700 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">Select item…</option>
                        {inventoryItems.map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name} ({item.quantityOnHand} {item.unit} available)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        required
                        value={line.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                        className="h-10 w-20 rounded-2xl border border-slate-200 px-3 text-center text-sm outline-none ring-lime-700 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {inventoryQuery.isLoading && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading inventory…
                  </p>
                )}
                {inventoryItems.length === 0 && !inventoryQuery.isLoading && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-amber-600">
                    <Package className="h-3 w-3" />
                    No inventory items found for this property
                  </p>
                )}
              </div>

              {/* Notes */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Notes <span className="text-xs font-normal text-slate-400">(optional)</span>
                </span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for the request, urgency, etc."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-lime-700 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </label>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => { setFormOpen(false); resetForm(); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-lime-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition hover:bg-lime-800 disabled:opacity-60"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Requisition card ──────────────────────────────────────────────────────

function RequisitionCard({ requisition }: { requisition: Requisition }) {
  const cfg = STATUS_CONFIG[requisition.status];
  const Icon = cfg.icon;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        {/* Left — request info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <p className="font-semibold text-slate-950 dark:text-white">{requisition.requestNumber}</p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cfg.badge}`}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {requisition.department} · {fmt(requisition.createdAt)}
          </p>

          {/* Items list */}
          <div className="mt-3 flex flex-wrap gap-2">
            {requisition.items.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Package className="h-3 w-3" />
                {item.quantity} {item.unit} {item.name}
              </span>
            ))}
          </div>

          {/* Notes */}
          {requisition.notes && (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 italic">
              "{requisition.notes}"
            </p>
          )}
        </div>

        {/* Right — status timeline indicator */}
        <StatusTimeline status={requisition.status} />
      </div>
    </div>
  );
}

// ─── Status timeline ───────────────────────────────────────────────────────

const TIMELINE_STEPS: Requisition['status'][] = ['Pending', 'Approved', 'Received'];

function StatusTimeline({ status }: { status: Requisition['status'] }) {
  if (status === 'Rejected') {
    return (
      <div className="shrink-0 flex flex-col items-center gap-1 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
        <XCircle className="h-5 w-5 text-red-500" />
        <p className="text-[10px] font-semibold text-red-600 dark:text-red-400">Rejected</p>
      </div>
    );
  }

  const currentIndex = TIMELINE_STEPS.indexOf(status as typeof TIMELINE_STEPS[number]);

  return (
    <div className="hidden shrink-0 items-center gap-1 sm:flex">
      {TIMELINE_STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step} className="flex items-center gap-1">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${
                done
                  ? active
                    ? 'bg-lime-700 text-white shadow shadow-lime-700/30'
                    : 'bg-lime-100 text-lime-700 dark:bg-lime-950/60 dark:text-lime-400'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
              }`}
            >
              {i + 1}
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div
                className={`h-0.5 w-4 rounded-full transition ${
                  i < currentIndex ? 'bg-lime-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
