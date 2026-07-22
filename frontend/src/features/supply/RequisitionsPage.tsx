import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Loader2, Package, Plus, Trash2, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Toolbar } from '../../components/ui/Toolbar';
import { useProperty } from '../../contexts/PropertyContext';
import { getProperties } from '../dashboard/dashboardApi';
import { createRequisition, decideRequisition, listInventory, listRequisitions } from './supplyApi';
import type { Requisition } from '../../types/api';

// ─── Status badge ──────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Requisition['status'], { badge: string; icon: React.ElementType }> = {
  Pending:  { badge: 'bg-amber-50 text-amber-700 ring-amber-200',   icon: Clock },
  Approved: { badge: 'bg-blue-50 text-blue-700 ring-blue-200',      icon: CheckCircle },
  Rejected: { badge: 'bg-red-50 text-red-700 ring-red-200',         icon: XCircle },
  Received: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle }
};

function StatusBadge({ status }: { status: Requisition['status'] }) {
  const { badge, icon: Icon } = STATUS_STYLES[status] ?? STATUS_STYLES.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badge}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

// ─── Line item type ────────────────────────────────────────────────────────

type LineItem = { inventoryItemId: string; quantity: number };

// ─── Page ──────────────────────────────────────────────────────────────────

export function RequisitionsPage() {
  const queryClient = useQueryClient();
  const { activePropertyId: propertyId } = useProperty();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  // Form state
  const [formPropertyId, setFormPropertyId] = useState('');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ inventoryItemId: '', quantity: 1 }]);

  const properties = useQuery({ queryKey: ['properties'], queryFn: getProperties });
  const inventory = useQuery({
    queryKey: ['requisition-inventory', propertyId || formPropertyId],
    queryFn: () => listInventory({ propertyId: (propertyId || formPropertyId) || undefined, limit: 200 })
  });

  const requisitions = useQuery({
    queryKey: ['requisitions', search, propertyId, status],
    // When status is '' (All statuses), omit the param so backend returns everything
    queryFn: () => listRequisitions({ search, propertyId: propertyId || undefined, status: status || undefined, limit: 50 })
  });

  const createMutation = useMutation({
    mutationFn: createRequisition,
    onSuccess: () => {
      toast.success('Requisition submitted');
      setFormOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Could not submit requisition')
  });

  const decisionMutation = useMutation({
    mutationFn: decideRequisition,
    onSuccess: (_, vars) => {
      const label = vars.action === 'approve' ? 'Approved' : vars.action === 'reject' ? 'Rejected' : 'Received';
      toast.success(`Requisition ${label.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Could not update requisition')
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
    const pid = propertyId || formPropertyId;
    if (!pid) { toast.error('Select a property'); return; }
    const validItems = lineItems.filter((item) => item.inventoryItemId && item.quantity > 0);
    if (validItems.length === 0) { toast.error('Add at least one item'); return; }
    createMutation.mutate({ propertyId: pid, department, notes: notes || undefined, items: validItems });
  }

  const inventoryItems = inventory.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Requisitions"
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

      <Toolbar search={search} onSearch={setSearch}>
        {/* "All statuses" sends value="" → omitted from API → returns all */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <option value="">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Received">Received</option>
        </select>
      </Toolbar>

      {/* ── Requisitions table ── */}
      {requisitions.isLoading ? (
        <Skeleton className="h-80" />
      ) : requisitions.data?.items.length ? (
        <DataTable<Requisition>
          rows={requisitions.data.items}
          columns={[
            { header: 'Request #', cell: (r) => <span className="font-semibold">{r.requestNumber}</span> },
            { header: 'Department', cell: (r) => r.department },
            {
              header: 'Items',
              cell: (r) => (
                <div className="flex flex-wrap gap-1.5">
                  {r.items.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <Package className="h-3 w-3" />
                      {item.quantity} {item.unit} {item.name}
                    </span>
                  ))}
                </div>
              )
            },
            { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
            {
              header: 'Actions',
              cell: (r) => (
                <div className="flex gap-2">
                  {r.status === 'Pending' && (
                    <>
                      <button
                        className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                        disabled={decisionMutation.isPending}
                        onClick={() => decisionMutation.mutate({ id: r._id, action: 'approve' })}
                      >
                        Approve
                      </button>
                      <button
                        className="rounded-xl bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
                        disabled={decisionMutation.isPending}
                        onClick={() => decisionMutation.mutate({ id: r._id, action: 'reject' })}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {r.status === 'Approved' && (
                    <button
                      className="rounded-xl bg-lime-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-lime-800 disabled:opacity-60"
                      disabled={decisionMutation.isPending}
                      onClick={() => decisionMutation.mutate({ id: r._id, action: 'receive' })}
                    >
                      Mark received
                    </button>
                  )}
                </div>
              )
            }
          ]}
        />
      ) : (
        <EmptyState
          title="No requisitions found"
          message={status ? `No ${status.toLowerCase()} requisitions. Try "All statuses" to see everything.` : 'Department requests and approvals will appear here.'}
        />
      )}

      {/* ── New request modal ── */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">New stock request</p>
                <p className="text-xs text-slate-500">Submit items for approval</p>
              </div>
              <button
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => { setFormOpen(false); resetForm(); }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {/* Property — only shown when no property is globally selected */}
              {!propertyId && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Property <span className="text-red-500">*</span>
                  </span>
                  <select
                    required
                    value={formPropertyId}
                    onChange={(e) => setFormPropertyId(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none ring-lime-700 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="">Select property…</option>
                    {properties.data?.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </label>
              )}

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
                  className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none ring-lime-700 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
                        className="h-10 flex-1 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none ring-lime-700 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">Select item…</option>
                        {inventoryItems.map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name} — {item.quantityOnHand} {item.unit} in stock
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        required
                        value={line.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                        className="h-10 w-20 rounded-2xl border border-slate-200 px-3 text-center text-sm outline-none ring-lime-700 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
                {inventory.isLoading && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading inventory…
                  </p>
                )}
              </div>

              {/* Notes */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Notes <span className="text-xs font-normal text-slate-400">(optional)</span>
                </span>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for the request, urgency, etc."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-lime-700 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <div className="flex justify-end gap-3 pt-1">
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
