import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, QrCode } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Toolbar } from '../../components/ui/Toolbar';
import { listGuests, listRooms } from '../operations/operationsApi';
import { getProperties } from '../dashboard/dashboardApi';
import {
  createMenuCategory,
  createMenuItem,
  createStaffOrder,
  listMenuCategories,
  listMenuItems,
  listOrders,
  type MenuItem
} from './restaurantApi';

const money = new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 });

export function RestaurantPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const properties = useQuery({ queryKey: ['properties'], queryFn: getProperties });
  const categories = useQuery({ queryKey: ['menu-categories'], queryFn: listMenuCategories });
  const menuItems = useQuery({ queryKey: ['menu-items', search, propertyId], queryFn: () => listMenuItems({ search, propertyId, limit: 100 }) });
  const orders = useQuery({ queryKey: ['restaurant-orders', propertyId], queryFn: () => listOrders({ propertyId, limit: 25 }) });
  const guests = useQuery({ queryKey: ['restaurant-guests', propertyId], queryFn: () => listGuests({ propertyId, limit: 100 }) });
  const rooms = useQuery({ queryKey: ['restaurant-rooms', propertyId], queryFn: () => listRooms({ propertyId, limit: 100 }) });

  const categoryMutation = useMutation({
    mutationFn: createMenuCategory,
    onSuccess: () => {
      toast.success('Category created');
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
    },
    onError: () => toast.error('Could not create category')
  });
  const itemMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => {
      toast.success('Menu item created');
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
    onError: () => toast.error('Could not create menu item')
  });
  const orderMutation = useMutation({
    mutationFn: createStaffOrder,
    onSuccess: () => {
      toast.success('Order sent to kitchen');
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      setSelectedItemId('');
    },
    onError: () => toast.error('Order requires a checked-in guest with an open folio')
  });

  return (
    <div>
      <PageHeader title="Restaurant" breadcrumb={['Workspace', 'Restaurant']} actions={<span className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-800"><QrCode className="h-4 w-4" />QR ordering ready</span>} />
      <Toolbar search={search} onSearch={setSearch}>
        <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
          <option value="">All properties</option>
          {properties.data?.map((property) => <option key={property._id} value={property._id}>{property.name}</option>)}
        </select>
      </Toolbar>

      <section className="grid gap-4 xl:grid-cols-2">
        <form className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          categoryMutation.mutate({
            propertyId: String(form.get('propertyId')),
            name: String(form.get('name')),
            description: String(form.get('description')),
            displayOrder: Number(form.get('displayOrder') || 0)
          });
          event.currentTarget.reset();
        }}>
          <h2 className="mb-3 font-semibold">Menu category</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <select name="propertyId" required className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <option value="">Property</option>
              {properties.data?.map((property) => <option key={property._id} value={property._id}>{property.name}</option>)}
            </select>
            <input name="name" required placeholder="Category name" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <input name="description" placeholder="Description" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <input name="displayOrder" type="number" min="0" placeholder="Display order" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          </div>
          <button className="mt-3 flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"><Plus className="h-4 w-4" />Save category</button>
        </form>

        <form className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          itemMutation.mutate({
            propertyId: String(form.get('propertyId')),
            categoryId: String(form.get('categoryId')),
            name: String(form.get('name')),
            description: String(form.get('description')),
            price: Number(form.get('price')),
            preparationMinutes: Number(form.get('preparationMinutes') || 20),
            isAvailable: true
          });
          event.currentTarget.reset();
        }}>
          <h2 className="mb-3 font-semibold">Menu item</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <select name="propertyId" required className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <option value="">Property</option>
              {properties.data?.map((property) => <option key={property._id} value={property._id}>{property.name}</option>)}
            </select>
            <select name="categoryId" required className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <option value="">Category</option>
              {categories.data?.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
            </select>
            <input name="name" required placeholder="Item name" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <input name="price" required type="number" min="0" placeholder="Price" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <input name="preparationMinutes" type="number" min="0" placeholder="Prep minutes" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <input name="description" placeholder="Description" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
          </div>
          <button className="mt-3 flex items-center gap-2 rounded-lg bg-lime-700 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Save item</button>
        </form>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div>
          <h2 className="mb-3 font-semibold">Menu</h2>
          {menuItems.isLoading ? <Skeleton className="h-64" /> : menuItems.data?.items.length ? (
            <DataTable<MenuItem> rows={menuItems.data.items} columns={[
              { header: 'Item', cell: (item) => item.name },
              { header: 'Price', cell: (item) => money.format(item.price) },
              { header: 'Prep', cell: (item) => `${item.preparationMinutes} min` },
              { header: 'Available', cell: (item) => item.isAvailable ? 'Yes' : 'No' }
            ]} />
          ) : <EmptyState title="No menu items" message="Create menu items for guests and reception ordering." />}
        </div>

        <div>
          <h2 className="mb-3 font-semibold">Manual order</h2>
          <form className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2" onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            orderMutation.mutate({
              propertyId: String(form.get('propertyId')),
              guestId: String(form.get('guestId')),
              roomId: String(form.get('roomId')),
              items: [{ menuItemId: selectedItemId, quantity: Number(form.get('quantity')) }]
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
            <select name="roomId" className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <option value="">Room</option>
              {rooms.data?.items.map((room) => <option key={room._id} value={room._id}>{room.roomNumber}</option>)}
            </select>
            <select value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <option value="">Menu item</option>
              {menuItems.data?.items.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
            </select>
            <input name="quantity" required type="number" min="1" defaultValue="1" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
            <button className="rounded-lg bg-lime-700 px-4 py-2 font-semibold text-white">Send order</button>
          </form>
          {orders.data?.items.length ? (
            <DataTable rows={orders.data.items} columns={[
              { header: 'Order', cell: (order) => order.orderNumber },
              { header: 'Status', cell: (order) => order.status },
              { header: 'Items', cell: (order) => order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ') },
              { header: 'Total', cell: (order) => money.format(order.totalAmount) }
            ]} />
          ) : <EmptyState title="No orders yet" message="Guest and reception orders will appear here." />}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">Room QR links</h2>
        {propertyId ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rooms.data?.items.map((room) => {
              const url = `/guest-portal/${propertyId}/${room._id}`;
              return (
                <article key={room._id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Room {room.roomNumber}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{room.type}</p>
                    </div>
                    <QrCode className="h-5 w-5 text-lime-800 dark:text-lime-300" />
                  </div>
                  <a className="mt-3 block truncate rounded-lg bg-slate-50 px-3 py-2 text-sm text-lime-800 dark:bg-slate-950 dark:text-lime-300" href={url} target="_blank" rel="noreferrer">
                    {url}
                  </a>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Select a property" message="Choose a property to generate room-specific guest portal links." />
        )}
      </section>
    </div>
  );
}
