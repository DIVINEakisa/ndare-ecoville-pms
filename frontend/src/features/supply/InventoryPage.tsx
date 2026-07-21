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
import { adjustStock, createInventoryItem, listInventory } from './supplyApi';

export function InventoryPage() {
  const queryClient = useQueryClient();
  const { activePropertyId: propertyId } = useProperty();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const properties = useQuery({ queryKey: ['properties'], queryFn: getProperties });
  const inventory = useQuery({
    queryKey: ['inventory', search, propertyId, category, lowStock],
    queryFn: () => listInventory({ search, propertyId: propertyId || undefined, category, lowStock, limit: 50 })
  });
  const createMutation = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      toast.success('Inventory item created');
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: () => toast.error('Could not create item')
  });
  const stockMutation = useMutation({
    mutationFn: adjustStock,
    onSuccess: () => {
      toast.success('Stock updated');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Could not update stock')
  });

  return (
    <div>
      <PageHeader
        title="Inventory"
        breadcrumb={['Workspace', 'Inventory']}
        actions={<button className="flex items-center gap-2 rounded-lg bg-lime-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setFormOpen((value) => !value)}><Plus className="h-4 w-4" />New item</button>}
      />
      <Toolbar search={search} onSearch={setSearch}>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
          <option value="">All categories</option>
          <option>Kitchen</option>
          <option>Room Supplies</option>
          <option>Cleaning</option>
          <option>Utilities</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
          <input type="checkbox" checked={lowStock} onChange={(event) => setLowStock(event.target.checked)} />
          Low stock
        </label>
      </Toolbar>

      {formOpen && (
        <form className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          createMutation.mutate({
            propertyId: String(form.get('propertyId')),
            name: String(form.get('name')),
            category: String(form.get('category')) as 'Kitchen',
            unit: String(form.get('unit')),
            quantityOnHand: Number(form.get('quantityOnHand')),
            lowStockThreshold: Number(form.get('lowStockThreshold')),
            supplier: String(form.get('supplier'))
          });
        }}>
          <select name="propertyId" required className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option value="">Property</option>
            {properties.data?.map((property) => <option key={property._id} value={property._id}>{property.name}</option>)}
          </select>
          <input name="name" required placeholder="Item name" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <select name="category" required className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <option>Kitchen</option>
            <option>Room Supplies</option>
            <option>Cleaning</option>
            <option>Utilities</option>
          </select>
          <input name="unit" required placeholder="Unit" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="quantityOnHand" type="number" min="0" defaultValue="0" placeholder="Quantity" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="lowStockThreshold" type="number" min="0" defaultValue="0" placeholder="Low stock threshold" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <input name="supplier" placeholder="Supplier" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          <button className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white dark:bg-white dark:text-slate-950">Save item</button>
        </form>
      )}

      {inventory.isLoading ? <Skeleton className="h-80" /> : inventory.data?.items.length ? (
        <DataTable rows={inventory.data.items} columns={[
          { header: 'Item', cell: (item) => item.name },
          { header: 'Category', cell: (item) => item.category },
          { header: 'On hand', cell: (item) => `${item.quantityOnHand} ${item.unit}` },
          { header: 'Threshold', cell: (item) => `${item.lowStockThreshold} ${item.unit}` },
          { header: 'Status', cell: (item) => item.quantityOnHand <= item.lowStockThreshold ? 'Low stock' : 'OK' },
          { header: 'Stock', cell: (item) => (
            <div className="flex gap-2">
              <button className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => stockMutation.mutate({ id: item._id, type: 'Purchase', quantity: 1 })}>+1</button>
              <button className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => stockMutation.mutate({ id: item._id, type: 'Issue', quantity: 1 })}>-1</button>
            </div>
          ) }
        ]} />
      ) : <EmptyState title="No inventory items" message="Create stock items to track quantities and low-stock alerts." />}
    </div>
  );
}
