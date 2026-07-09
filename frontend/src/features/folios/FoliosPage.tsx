import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, Receipt, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Toolbar } from '../../components/ui/Toolbar';
import type { Folio, Guest, Payment } from '../../types/api';
import { listFolios, postFolioPayment } from './foliosApi';

const money = new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 });

function guestName(value: Folio['guestId']) {
  return typeof value === 'string' ? value : (value as Guest).fullName;
}

export function FoliosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedFolio, setSelectedFolio] = useState<Folio | null>(null);
  const folios = useQuery({
    queryKey: ['folios', search, status],
    queryFn: () => listFolios({ search, status, limit: 50 })
  });
  const paymentMutation = useMutation({
    mutationFn: postFolioPayment,
    onSuccess: () => {
      toast.success('Payment posted');
      setSelectedFolio(null);
      queryClient.invalidateQueries({ queryKey: ['folios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: () => toast.error('Could not post payment')
  });

  return (
    <div>
      <PageHeader title="Guest Folios" breadcrumb={['Workspace', 'Folios']} />
      <Toolbar search={search} onSearch={setSearch}>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
          <option value="">All statuses</option>
          <option>Open</option>
          <option>Partially Paid</option>
          <option>Settled</option>
          <option>Void</option>
        </select>
      </Toolbar>

      {folios.isLoading ? (
        <Skeleton className="h-96" />
      ) : folios.data?.items.length ? (
        <DataTable<Folio>
          rows={folios.data.items}
          columns={[
            { header: 'Guest', cell: (folio) => <span className="font-semibold text-slate-950 dark:text-white">{guestName(folio.guestId)}</span> },
            { header: 'Status', cell: (folio) => <StatusBadge status={folio.status} /> },
            { header: 'Subtotal', cell: (folio) => money.format(folio.subtotal) },
            { header: 'Paid', cell: (folio) => money.format(folio.paidTotal) },
            { header: 'Balance', cell: (folio) => <span className={folio.balance > 0 ? 'font-semibold text-amber-700' : 'font-semibold text-emerald-700'}>{money.format(folio.balance)}</span> },
            {
              header: 'Action',
              cell: (folio) => (
                <button
                  disabled={folio.status === 'Settled' || folio.status === 'Void'}
                  className="inline-flex items-center gap-2 rounded-xl bg-lime-700 px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-lime-800 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setSelectedFolio(folio)}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Pay
                </button>
              )
            }
          ]}
        />
      ) : (
        <EmptyState title="No folios found" message="Open guest balances and settled folios will appear here after check-in." />
      )}

      {selectedFolio && (
        <PaymentModal
          folio={selectedFolio}
          isSubmitting={paymentMutation.isPending}
          onClose={() => setSelectedFolio(null)}
          onSubmit={(input) => paymentMutation.mutate(input)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Folio['status'] }) {
  const classes = {
    Open: 'bg-blue-50 text-blue-700 ring-blue-200',
    'Partially Paid': 'bg-amber-50 text-amber-700 ring-amber-200',
    Settled: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Void: 'bg-red-50 text-red-700 ring-red-200'
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${classes[status]}`}>{status}</span>;
}

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
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSubmit({
            folioId: folio._id,
            amount: Number(form.get('amount')),
            method: String(form.get('method')) as Payment['method'],
            reference: String(form.get('reference'))
          });
        }}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-50 text-lime-800">
              <Receipt className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">Post payment</h2>
            <p className="mt-1 text-sm text-slate-500">Outstanding balance: {money.format(folio.balance)}</p>
          </div>
          <button type="button" className="rounded-xl p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Amount
            <input name="amount" type="number" min="1" max={folio.balance || undefined} defaultValue={folio.balance} required className="h-12 rounded-2xl border border-slate-200 px-4 font-normal outline-none ring-lime-700 transition-colors duration-200 focus:ring-2 dark:border-slate-800 dark:bg-slate-950" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Method
            <select name="method" required className="h-12 rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none ring-lime-700 transition-colors duration-200 focus:ring-2 dark:border-slate-800 dark:bg-slate-950">
              <option>Cash</option>
              <option>Card</option>
              <option>MTN Mobile Money</option>
              <option>Airtel Money</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Reference
            <input name="reference" className="h-12 rounded-2xl border border-slate-200 px-4 font-normal outline-none ring-lime-700 transition-colors duration-200 focus:ring-2 dark:border-slate-800 dark:bg-slate-950" />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-2xl bg-lime-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition-colors duration-200 hover:bg-lime-800 disabled:opacity-60">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Post payment
          </button>
        </div>
      </form>
    </div>
  );
}
