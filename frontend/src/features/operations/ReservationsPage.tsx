import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Toolbar } from '../../components/ui/Toolbar';
import type { Guest, Room } from '../../types/api';
import { getProperties } from '../dashboard/dashboardApi';
import { createReservation, listGuests, listReservations, listRooms } from './operationsApi';

function guestName(value: Guest | string) {
  return typeof value === 'string' ? value : value.fullName;
}

function roomName(value: Pick<Room, '_id' | 'roomNumber' | 'name' | 'type'> | string) {
  return typeof value === 'string' ? value : `${value.roomNumber} · ${value.type}`;
}

export function ReservationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const properties = useQuery({ queryKey: ['properties'], queryFn: getProperties });
  const guests = useQuery({ queryKey: ['reservation-guests', propertyId], queryFn: () => listGuests({ propertyId, limit: 100 }) });
  const rooms = useQuery({ queryKey: ['reservation-rooms', propertyId], queryFn: () => listRooms({ propertyId, limit: 100 }) });
  const reservations = useQuery({
    queryKey: ['reservations', search, propertyId],
    queryFn: () => listReservations({ search, propertyId, limit: 25 })
  });
  const mutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      toast.success('Reservation created');
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error ? 'Room is unavailable for those dates' : 'Could not create reservation';
      toast.error(message);
    }
  });

  return (
    <div>
      <PageHeader title="Reservations" breadcrumb={['Workspace', 'Reservations']} actions={<button className="flex items-center gap-2 rounded-lg bg-lime-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setFormOpen((value) => !value)}><Plus className="h-4 w-4" />New reservation</button>} />
      <Toolbar search={search} onSearch={setSearch}>
        <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
          <option value="">All properties</option>
          {properties.data?.map((property) => <option key={property._id} value={property._id}>{property.name}</option>)}
        </select>
      </Toolbar>
      {formOpen && (
        <form className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          mutation.mutate({
            propertyId: String(form.get('propertyId')),
            guestId: String(form.get('guestId')),
            roomId: String(form.get('roomId')),
            source: String(form.get('source')) as 'Direct',
            status: String(form.get('status')) as 'Confirmed',
            checkIn: String(form.get('checkIn')),
            checkOut: String(form.get('checkOut')),
            adults: Number(form.get('adults')),
            children: Number(form.get('children')),
            totalAmount: Number(form.get('totalAmount')),
            paidAmount: Number(form.get('paidAmount')),
            notes: String(form.get('notes'))
          });
        }}>
          <select name="propertyId" required onChange={(event) => setPropertyId(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option value="">Property</option>
            {properties.data?.map((property) => <option key={property._id} value={property._id}>{property.name}</option>)}
          </select>
          <select name="guestId" required className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option value="">Guest</option>
            {guests.data?.items.map((guest) => <option key={guest._id} value={guest._id}>{guest.fullName}</option>)}
          </select>
          <select name="roomId" required className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option value="">Room</option>
            {rooms.data?.items.map((room) => <option key={room._id} value={room._id}>{room.roomNumber} · {room.type}</option>)}
          </select>
          <input name="checkIn" required type="date" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="checkOut" required type="date" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <select name="status" className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option>Confirmed</option>
            <option>Pending</option>
          </select>
          <select name="source" className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option>Direct</option>
            <option>Phone</option>
            <option>Walk-in</option>
            <option>Lodgify</option>
          </select>
          <input name="adults" required type="number" min="1" defaultValue="1" placeholder="Adults" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="children" required type="number" min="0" defaultValue="0" placeholder="Children" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="totalAmount" required type="number" min="0" placeholder="Total amount" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="paidAmount" required type="number" min="0" defaultValue="0" placeholder="Paid amount" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="notes" placeholder="Notes" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-white dark:bg-white dark:text-slate-950" disabled={mutation.isPending}>Save reservation</button>
        </form>
      )}
      {reservations.isLoading ? <Skeleton className="h-72" /> : reservations.data?.items.length ? (
        <DataTable rows={reservations.data.items} columns={[
          { header: 'Guest', cell: (reservation) => guestName(reservation.guestId) },
          { header: 'Room', cell: (reservation) => roomName(reservation.roomId) },
          { header: 'Dates', cell: (reservation) => `${new Date(reservation.checkIn).toLocaleDateString()} - ${new Date(reservation.checkOut).toLocaleDateString()}` },
          { header: 'Status', cell: (reservation) => reservation.status },
          { header: 'Source', cell: (reservation) => reservation.source },
          { header: 'Total', cell: (reservation) => new Intl.NumberFormat('en-RW').format(reservation.totalAmount) }
        ]} />
      ) : <EmptyState title="No reservations found" message="Reservations will appear here after booking or Lodgify sync." />}
    </div>
  );
}
