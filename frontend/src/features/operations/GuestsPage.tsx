import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Toolbar } from '../../components/ui/Toolbar';
import { useProperty } from '../../contexts/PropertyContext';
import { getProperties } from '../dashboard/dashboardApi';
import { createGuest, listGuests } from './operationsApi';

export function GuestsPage() {
  const queryClient = useQueryClient();
  const { activePropertyId: propertyId } = useProperty();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const properties = useQuery({ queryKey: ['properties'], queryFn: getProperties });
  const guests = useQuery({ queryKey: ['guests', search, propertyId], queryFn: () => listGuests({ search, propertyId: propertyId || undefined, limit: 25 }) });
  const mutation = useMutation({
    mutationFn: createGuest,
    onSuccess: () => {
      toast.success('Guest created');
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
    onError: () => toast.error('Could not create guest')
  });

  return (
    <div>
      <PageHeader title="Guests" breadcrumb={['Workspace', 'Guests']} actions={<button className="flex items-center gap-2 rounded-lg bg-lime-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setFormOpen((value) => !value)}><Plus className="h-4 w-4" />New guest</button>} />
      <Toolbar search={search} onSearch={setSearch} />
      {formOpen && (
        <form className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          mutation.mutate({
            propertyId: String(form.get('propertyId')),
            fullName: String(form.get('fullName')),
            email: String(form.get('email')),
            phone: String(form.get('phone')),
            nationality: String(form.get('nationality')),
            documentType: String(form.get('documentType')) as 'Passport',
            documentNumber: String(form.get('documentNumber'))
          });
        }}>
          <select name="propertyId" required className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option value="">Property</option>
            {properties.data?.map((property) => <option key={property._id} value={property._id}>{property.name}</option>)}
          </select>
          <input name="fullName" required placeholder="Full name" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="phone" placeholder="Phone" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="email" type="email" placeholder="Email" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="nationality" placeholder="Nationality" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <select name="documentType" className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option>Passport</option>
            <option>National ID</option>
            <option>Driver License</option>
            <option>Other</option>
          </select>
          <input name="documentNumber" placeholder="Document number" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-white dark:bg-white dark:text-slate-950" disabled={mutation.isPending}>Save guest</button>
        </form>
      )}
      {guests.isLoading ? <Skeleton className="h-72" /> : guests.data?.items.length ? (
        <DataTable rows={guests.data.items} columns={[
          { header: 'Guest', cell: (guest) => guest.fullName },
          { header: 'Phone', cell: (guest) => guest.phone || 'Not provided' },
          { header: 'Email', cell: (guest) => guest.email || 'Not provided' },
          { header: 'Nationality', cell: (guest) => guest.nationality || 'Not provided' },
          { header: 'Document', cell: (guest) => guest.documentNumber || 'Not captured' }
        ]} />
      ) : <EmptyState title="No guests found" message="Guest profiles will appear here after they are created." />}
    </div>
  );
}
