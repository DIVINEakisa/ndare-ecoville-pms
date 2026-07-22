/**
 * FoliosPage — accessible to: Owner, Admin, Property Manager, Receptionist, Cashier
 *
 * Lists all guest folios with:
 *  - Payment posting modal (Cash / Card / Mobile Money)
 *  - Printable invoice generation (browser print API)
 *
 * Cashiers use this as their primary settlement workspace.
 * Receptionists use it to view balances and post deposits at check-in.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Download, Loader2, Printer, Receipt, X } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Toolbar } from '../../components/ui/Toolbar';
import type { Folio, FolioItem, Guest, Payment } from '../../types/api';
import { getFolio, listFolios, postFolioPayment } from './foliosApi';

const money = new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 });
const date  = (iso: string) => new Date(iso).toLocaleDateString('en-RW', { dateStyle: 'medium' });

function guestName(value: Folio['guestId']) {
  return typeof value === 'string' ? value : (value as Guest).fullName;
}

// ─── Page ─────────────────────────────────────────────────────────────────

export function FoliosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch]             = useState('');
  const [status, setStatus]             = useState('');
  const [payFolio, setPayFolio]         = useState<Folio | null>(null);
  const [invoiceFolio, setInvoiceFolio] = useState<Folio | null>(null);

  const folios = useQuery({
    queryKey: ['folios', search, status],
    queryFn: () => listFolios({ search, status, limit: 50 })
  });

  const paymentMutation = useMutation({
    mutationFn: postFolioPayment,
    onSuccess: () => {
      toast.success('Payment posted');
      setPayFolio(null);
      queryClient.invalidateQueries({ queryKey: ['folios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: () => toast.error('Could not post payment')
  });

  return (
    <div>
      <PageHeader title="Guest Folios" breadcrumb={['Workspace', 'Folios']} />

      <Toolbar search={search} onSearch={setSearch}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <option value="">All statuses</option>
          <option value="Open">Open</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Settled">Settled</option>
          <option value="Void">Void</option>
        </select>
      </Toolbar>

      {folios.isLoading ? (
        <Skeleton className="h-96" />
      ) : folios.data?.items.length ? (
        <DataTable<Folio>
          rows={folios.data.items}
          columns={[
            {
              header: 'Guest',
              cell: (f) => (
                <span className="font-semibold text-slate-950 dark:text-white">
                  {guestName(f.guestId)}
                </span>
              )
            },
            { header: 'Status',   cell: (f) => <StatusBadge status={f.status} /> },
            { header: 'Subtotal', cell: (f) => money.format(f.subtotal) },
            { header: 'Paid',     cell: (f) => money.format(f.paidTotal) },
            {
              header: 'Balance',
              cell: (f) => (
                <span className={f.balance > 0 ? 'font-semibold text-amber-700' : 'font-semibold text-emerald-700'}>
                  {money.format(f.balance)}
                </span>
              )
            },
            {
              header: 'Actions',
              cell: (f) => (
                <div className="flex items-center gap-2">
                  {/* Pay button — disabled for settled/void folios */}
                  <button
                    disabled={f.status === 'Settled' || f.status === 'Void'}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-lime-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-lime-800 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setPayFolio(f)}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Pay
                  </button>
                  {/* Invoice button — always available */}
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    onClick={() => setInvoiceFolio(f)}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Invoice
                  </button>
                </div>
              )
            }
          ]}
        />
      ) : (
        <EmptyState
          title="No folios found"
          message="Open guest balances and settled folios will appear here after check-in."
        />
      )}

      {/* Payment modal */}
      {payFolio && (
        <PaymentModal
          folio={payFolio}
          isSubmitting={paymentMutation.isPending}
          onClose={() => setPayFolio(null)}
          onSubmit={(input) => paymentMutation.mutate(input)}
        />
      )}

      {/* Invoice modal */}
      {invoiceFolio && (
        <InvoiceModal
          folio={invoiceFolio}
          onClose={() => setInvoiceFolio(null)}
        />
      )}
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Folio['status'] }) {
  const classes: Record<Folio['status'], string> = {
    Open:            'bg-blue-50 text-blue-700 ring-blue-200',
    'Partially Paid':'bg-amber-50 text-amber-700 ring-amber-200',
    Settled:         'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Void:            'bg-red-50 text-red-700 ring-red-200'
  };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${classes[status]}`}>
      {status}
    </span>
  );
}

// ─── Payment modal ─────────────────────────────────────────────────────────

function PaymentModal({
  folio,
  isSubmitting,
  onClose,
  onSubmit
}: {
  folio: Folio;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: { folioId: string; amount: number; method: Payment['method']; reference?: string }) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          onSubmit({
            folioId:   folio._id,
            amount:    Number(form.get('amount')),
            method:    String(form.get('method')) as Payment['method'],
            reference: String(form.get('reference')) || undefined
          });
        }}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-50 text-lime-800">
              <Receipt className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">Post payment</h2>
            <p className="mt-1 text-sm text-slate-500">
              Guest: <span className="font-semibold">{guestName(folio.guestId)}</span>
              <br />
              Outstanding balance: <span className="font-semibold text-amber-700">{money.format(folio.balance)}</span>
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Amount
            <input
              name="amount"
              type="number"
              min="1"
              max={folio.balance || undefined}
              defaultValue={folio.balance}
              required
              className="h-12 rounded-2xl border border-slate-200 px-4 font-normal outline-none ring-lime-700 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Method
            <select
              name="method"
              required
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none ring-lime-700 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
            >
              <option>Cash</option>
              <option>Card</option>
              <option>MTN Mobile Money</option>
              <option>Airtel Money</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Reference <span className="font-normal text-slate-400">(optional)</span>
            <input
              name="reference"
              className="h-12 rounded-2xl border border-slate-200 px-4 font-normal outline-none ring-lime-700 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-lime-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition hover:bg-lime-800 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Post payment
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Invoice modal ─────────────────────────────────────────────────────────

function InvoiceModal({ folio, onClose }: { folio: Folio; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch full folio details (items + payment history)
  const detailQuery = useQuery({
    queryKey: ['folio-detail', folio._id],
    queryFn: () => getFolio(folio._id)
  });

  const detail = detailQuery.data;
  const guest  = typeof folio.guestId === 'string' ? null : (folio.guestId as Guest);

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;

    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice — ${guestName(folio.guestId)}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: system-ui, sans-serif; font-size: 13px; color: #1e293b; padding: 40px; }
            h1  { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
            h2  { font-size: 15px; font-weight: 600; margin: 24px 0 8px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
            .label  { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
            th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; background: #f8fafc; }
            .total-row td { font-weight: 700; border-top: 2px solid #e2e8f0; }
            .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
            .settled  { background: #ecfdf5; color: #047857; }
            .open     { background: #eff6ff; color: #1d4ed8; }
            .partial  { background: #fffbeb; color: #b45309; }
            .void     { background: #fef2f2; color: #b91c1c; }
            .right { text-align: right; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  }

  const statusClass: Record<Folio['status'], string> = {
    Settled: 'settled', Open: 'open', 'Partially Paid': 'partial', Void: 'void'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-50 text-lime-800">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-950 dark:text-white">Invoice</p>
              <p className="text-xs text-slate-500">{guestName(folio.guestId)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-lime-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-lime-800"
            >
              <Download className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable invoice body */}
        <div className="flex-1 overflow-y-auto p-6">
          {detailQuery.isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <div ref={printRef}>
              {/* ── Invoice header ── */}
              <div className="header">
                <div>
                  <h1>Invoice</h1>
                  <p className="label mt-1">Ndare Ecoville · Ndare PMS</p>
                </div>
                <div className="right">
                  <p className="label">Date issued</p>
                  <p className="font-semibold">{date(folio.updatedAt)}</p>
                  <p className="label mt-2">Status</p>
                  <span className={`badge ${statusClass[folio.status]}`}>{folio.status}</span>
                </div>
              </div>

              {/* ── Bill to ── */}
              <h2>Bill to</h2>
              <table>
                <tbody>
                  <tr>
                    <td className="label" style={{ width: 140 }}>Guest name</td>
                    <td className="font-semibold">{guestName(folio.guestId)}</td>
                  </tr>
                  {guest?.email && (
                    <tr>
                      <td className="label">Email</td>
                      <td>{guest.email}</td>
                    </tr>
                  )}
                  {guest?.phone && (
                    <tr>
                      <td className="label">Phone</td>
                      <td>{guest.phone}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* ── Line items ── */}
              <h2>Charges</h2>
              {detail?.items && detail.items.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Source</th>
                      <th className="right">Qty</th>
                      <th className="right">Unit price</th>
                      <th className="right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item: FolioItem) => (
                      <tr key={item._id}>
                        <td>{item.description}</td>
                        <td>{item.source}</td>
                        <td className="right">{item.quantity}</td>
                        <td className="right">{money.format(item.unitPrice)}</td>
                        <td className="right">{money.format(item.total)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={4}>Subtotal</td>
                      <td className="right">{money.format(folio.subtotal)}</td>
                    </tr>
                    {folio.taxTotal > 0 && (
                      <tr>
                        <td colSpan={4}>Tax</td>
                        <td className="right">{money.format(folio.taxTotal)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-slate-400">No line items recorded.</p>
              )}

              {/* ── Payment history ── */}
              {detail?.payments && detail.payments.length > 0 && (
                <>
                  <h2>Payments received</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th className="right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.payments.map((p: Payment) => (
                        <tr key={p._id}>
                          <td>{date(p.paidAt)}</td>
                          <td>{p.method}</td>
                          <td>{p.reference ?? '—'}</td>
                          <td className="right">{money.format(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* ── Summary totals ── */}
              <table style={{ marginTop: 16 }}>
                <tbody>
                  <tr>
                    <td className="label">Total charged</td>
                    <td className="right">{money.format(folio.subtotal + (folio.taxTotal ?? 0))}</td>
                  </tr>
                  <tr>
                    <td className="label">Total paid</td>
                    <td className="right">{money.format(folio.paidTotal)}</td>
                  </tr>
                  <tr className="total-row">
                    <td>Balance due</td>
                    <td className="right">{money.format(folio.balance)}</td>
                  </tr>
                </tbody>
              </table>

              <p
                style={{ marginTop: 32, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}
              >
                Thank you for staying with us · Ndare Ecoville · Generated by Ndare PMS
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
