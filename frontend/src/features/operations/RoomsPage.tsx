import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Toolbar } from '../../components/ui/Toolbar';
import { getProperties } from '../dashboard/dashboardApi';
import { createRoom, listRooms } from './operationsApi';

export function RoomsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const properties = useQuery({ queryKey: ['properties'], queryFn: getProperties });
  const rooms = useQuery({ queryKey: ['rooms', search, propertyId], queryFn: () => listRooms({ search, propertyId, limit: 25 }) });
  const mutation = useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      toast.success('Room created');
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: () => toast.error('Could not create room')
  });

  return (
    <div>
      <PageHeader
        title="Rooms"
        breadcrumb={['Workspace', 'Rooms']}
        actions={
          <button className="flex items-center gap-2 rounded-lg bg-lime-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setFormOpen((value) => !value)}>
            <Plus className="h-4 w-4" />
            New room
          </button>
        }
      />
      <Toolbar search={search} onSearch={setSearch}>
        <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
          <option value="">All properties</option>
          {properties.data?.map((property) => (
            <option key={property._id} value={property._id}>{property.name}</option>
          ))}
        </select>
      </Toolbar>
      {formOpen && (
        <form
          className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            mutation.mutate({
              propertyId: String(form.get('propertyId')),
              roomNumber: String(form.get('roomNumber')),
              name: String(form.get('name')),
              type: String(form.get('type')),
              capacity: Number(form.get('capacity')),
              baseRate: Number(form.get('baseRate')),
              status: 'Available',
              amenities: []
            });
          }}
        >
          <select name="propertyId" required className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option value="">Property</option>
            {properties.data?.map((property) => (
              <option key={property._id} value={property._id}>{property.name}</option>
            ))}
          </select>
          <input name="roomNumber" required placeholder="Room number" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="name" placeholder="Display name" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="type" required placeholder="Type" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="capacity" required type="number" min="1" placeholder="Capacity" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="baseRate" required type="number" min="0" placeholder="Base rate" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-white dark:bg-white dark:text-slate-950" disabled={mutation.isPending}>Save room</button>
        </form>
      )}
      {rooms.isLoading ? <Skeleton className="h-72" /> : rooms.data?.items.length ? (
        <DataTable
          rows={rooms.data.items}
          columns={[
            { header: 'Room', cell: (room) => `${room.roomNumber} ${room.name ? `· ${room.name}` : ''}` },
            { header: 'Type', cell: (room) => room.type },
            { header: 'Capacity', cell: (room) => room.capacity },
            { header: 'Base rate', cell: (room) => new Intl.NumberFormat('en-RW').format(room.baseRate) },
            { header: 'Status', cell: (room) => room.status }
          ]}
        />
      ) : <EmptyState title="No rooms found" message="Create rooms or adjust your filters to see inventory." />}
    </div>
  );
}
