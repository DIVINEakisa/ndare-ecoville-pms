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
import { createRequisition, decideRequisition, listInventory, listRequisitions } from './supplyApi';

export function RequisitionsPage() {
  const queryClient = useQueryClient();
  const { activePropertyId: propertyId } = useProperty();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const properties = useQuery({ queryKey: ['properties'], queryFn: getProperties });
  const inventory = useQuery({ queryKey: ['requisition-inventory', propertyId], queryFn: () => listInventory({ propertyId: propertyId || undefined, limit: 100 }) });
  const requisitions = useQuery({
    queryKey: ['requisitions', search, propertyId, status],
    queryFn: () => listRequisitions({ search, propertyId: propertyId || undefined, status: status || undefined, limit: 50 })
  });
  const createMutation = useMutation({
    mutationFn: createRequisition,
    onSuccess: () => {
      toast.success('Requisition submitted');
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Could not submit requisition')
  });
  const decisionMutation = useMutation({
    mutationFn: decideRequisition,
    onSuccess: () => {
      toast.success('Requisition updated');
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Could not update requisition')
  });

  return (
    <div>
      <PageHeader title="Requisitions" breadcrumb={['Workspace', 'Requisitions']} actions={<button className="flex items-center gap-2 rounded-lg bg-lime-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setFormOpen((value) => !value)}><Plus className="h-4 w-4" />New request</button>} />
      <Toolbar search={search} onSearch={setSearch}>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
          <option value="">All statuses</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
          <option>Received</option>
        </select>
      </Toolbar>

      {formOpen && (
        <form className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          createMutation.mutate({
            propertyId: String(form.get('propertyId')),
            department: String(form.get('department')),
            notes: String(form.get('notes')),
            items: [{ inventoryItemId: selectedItemId, quantity: Number(form.get('quantity')) }]
          });
        }}>
          <select name="propertyId" required defaultValue={propertyId} className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option value="">Property</option>
            {properties.data?.map((property) => <option key={property._id} value={property._id}>{property.name}</option>)}
          </select>
          <input name="department" required placeholder="Department" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <select value={selectedItemId} required onChange={(event) => setSelectedItemId(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option value="">Inventory item</option>
            {inventory.data?.items.map((item) => <option key={item._id} value={item._id}>{item.name} ({item.quantityOnHand} {item.unit})</option>)}
          </select>
          <input name="quantity" required type="number" min="1" defaultValue="1" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="notes" placeholder="Notes" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <button className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white dark:bg-white dark:text-slate-950">Submit request</button>
        </form>
      )}

      {requisitions.isLoading ? <Skeleton className="h-80" /> : requisitions.data?.items.length ? (
        <DataTable rows={requisitions.data.items} columns={[
          { header: 'Request', cell: (request) => request.requestNumber },
          { header: 'Department', cell: (request) => request.department },
          { header: 'Items', cell: (request) => request.items.map((item) => `${item.quantity} ${item.unit} ${item.name}`).join(', ') },
          { header: 'Status', cell: (request) => request.status },
          { header: 'Actions', cell: (request) => (
            <div className="flex gap-2">
              {request.status === 'Pending' && (
                <>
                  <button className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => decisionMutation.mutate({ id: request._id, action: 'approve' })}>Approve</button>
                  <button className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => decisionMutation.mutate({ id: request._id, action: 'reject' })}>Reject</button>
                </>
              )}
              {request.status === 'Approved' && (
                <button className="rounded-lg bg-lime-700 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => decisionMutation.mutate({ id: request._id, action: 'receive' })}>Receive</button>
              )}
            </div>
          ) }
        ]} />
      ) : <EmptyState title="No requisitions found" message="Department requests and approvals will appear here." />}
    </div>
  );
}
