import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Guest, Room } from '../../types/api';
import { checkOutReservation, listReservations } from './operationsApi';

function guestName(value: Guest | string) {
  return typeof value === 'string' ? value : value.fullName;
}

function roomName(value: Pick<Room, '_id' | 'roomNumber' | 'name' | 'type'> | string) {
  return typeof value === 'string' ? value : value.roomNumber;
}

export function CheckOutPage() {
  const queryClient = useQueryClient();
  const [selectedReservationId, setSelectedReservationId] = useState('');
  const reservations = useQuery({ queryKey: ['checkout-reservations'], queryFn: () => listReservations({ status: 'Checked In', limit: 50 }) });
  const mutation = useMutation({
    mutationFn: checkOutReservation,
    onSuccess: () => {
      toast.success('Guest checked out');
      queryClient.invalidateQueries({ queryKey: ['checkout-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setSelectedReservationId('');
    },
    onError: () => toast.error('Checkout requires a settled folio')
  });

  return (
    <div>
      <PageHeader title="Check-out" breadcrumb={['Workspace', 'Check-out']} />
      {selectedReservationId && (
        <form
          className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const amount = Number(form.get('amount'));
            mutation.mutate({
              reservationId: selectedReservationId,
              payment: amount > 0 ? {
                amount,
                method: String(form.get('method')),
                reference: String(form.get('reference'))
              } : undefined
            });
          }}
        >
          <input name="amount" type="number" min="0" defaultValue="0" placeholder="Final payment amount" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <select name="method" className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option>Cash</option>
            <option>Card</option>
            <option>MTN Mobile Money</option>
            <option>Airtel Money</option>
          </select>
          <input name="reference" placeholder="Payment reference" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <button className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white dark:bg-white dark:text-slate-950" disabled={mutation.isPending}>Complete check-out</button>
        </form>
      )}
      {reservations.isLoading ? <Skeleton className="h-72" /> : reservations.data?.items.length ? (
        <DataTable rows={reservations.data.items} columns={[
          { header: 'Guest', cell: (reservation) => guestName(reservation.guestId) },
          { header: 'Room', cell: (reservation) => roomName(reservation.roomId) },
          { header: 'Departure', cell: (reservation) => new Date(reservation.checkOut).toLocaleDateString() },
          { header: 'Total', cell: (reservation) => new Intl.NumberFormat('en-RW').format(reservation.totalAmount) },
          { header: 'Action', cell: (reservation) => <button className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950" onClick={() => setSelectedReservationId(reservation._id)}>Settle</button> }
        ]} />
      ) : <EmptyState title="No active stays" message="Checked-in guests ready for checkout will appear here." />}
    </div>
  );
}
