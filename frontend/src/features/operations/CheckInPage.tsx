import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Guest, Room } from '../../types/api';
import { checkInReservation, listReservations } from './operationsApi';

function guestName(value: Guest | string) {
  return typeof value === 'string' ? value : value.fullName;
}

function roomName(value: Pick<Room, '_id' | 'roomNumber' | 'name' | 'type'> | string) {
  return typeof value === 'string' ? value : value.roomNumber;
}

export function CheckInPage() {
  const queryClient = useQueryClient();
  const [selectedReservationId, setSelectedReservationId] = useState('');
  const reservations = useQuery({ queryKey: ['checkin-reservations'], queryFn: () => listReservations({ status: 'Confirmed', limit: 50 }) });
  const mutation = useMutation({
    mutationFn: checkInReservation,
    onSuccess: () => {
      toast.success('Guest checked in');
      queryClient.invalidateQueries({ queryKey: ['checkin-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setSelectedReservationId('');
    },
    onError: () => toast.error('Could not complete check-in')
  });

  return (
    <div>
      <PageHeader title="Check-in" breadcrumb={['Workspace', 'Check-in']} />
      {selectedReservationId && (
        <form
          className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const amount = Number(form.get('amount'));
            mutation.mutate({
              reservationId: selectedReservationId,
              guestDocument: {
                documentType: String(form.get('documentType')),
                documentNumber: String(form.get('documentNumber'))
              },
              emergencyContact: {
                name: String(form.get('emergencyName')),
                phone: String(form.get('emergencyPhone')),
                relationship: String(form.get('emergencyRelationship'))
              },
              payment: amount > 0 ? {
                amount,
                method: String(form.get('method')),
                reference: String(form.get('reference'))
              } : undefined
            });
          }}
        >
          <select name="documentType" className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option>Passport</option>
            <option>National ID</option>
            <option>Driver License</option>
            <option>Other</option>
          </select>
          <input name="documentNumber" placeholder="Document number" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="emergencyName" placeholder="Emergency contact name" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="emergencyPhone" placeholder="Emergency contact phone" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="emergencyRelationship" placeholder="Relationship" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="amount" type="number" min="0" defaultValue="0" placeholder="Payment amount" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <select name="method" className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option>Cash</option>
            <option>Card</option>
            <option>MTN Mobile Money</option>
            <option>Airtel Money</option>
          </select>
          <input name="reference" placeholder="Payment reference" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <button className="rounded-lg bg-lime-700 px-4 py-2 font-semibold text-white" disabled={mutation.isPending}>Complete check-in</button>
        </form>
      )}
      {reservations.isLoading ? <Skeleton className="h-72" /> : reservations.data?.items.length ? (
        <DataTable rows={reservations.data.items} columns={[
          { header: 'Guest', cell: (reservation) => guestName(reservation.guestId) },
          { header: 'Room', cell: (reservation) => roomName(reservation.roomId) },
          { header: 'Arrival', cell: (reservation) => new Date(reservation.checkIn).toLocaleDateString() },
          { header: 'Balance', cell: (reservation) => new Intl.NumberFormat('en-RW').format(reservation.totalAmount - reservation.paidAmount) },
          { header: 'Action', cell: (reservation) => <button className="rounded-lg bg-lime-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => setSelectedReservationId(reservation._id)}>Prepare</button> }
        ]} />
      ) : <EmptyState title="No confirmed arrivals" message="Confirmed reservations ready for check-in will appear here." />}
    </div>
  );
}
