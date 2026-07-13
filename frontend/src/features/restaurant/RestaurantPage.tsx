import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat, Clock, Loader2, Plus, QrCode,
  Settings2, ShoppingCart, Utensils
} from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../auth/AuthProvider';
import { getProperties } from '../dashboard/dashboardApi';
import { listGuests, listRooms } from '../operations/operationsApi';
import {
  createMenuCategory,
  createMenuItem,
  createStaffOrder,
  listMenuCategories,
  listMenuItems,
  listOrders,
  type MenuItem,
  type RestaurantOrder,
} from './restaurantApi';
import type { UserRole } from '../../types/api';

const money = new Intl.NumberFormat('en-RW', {
  style: 'currency', currency: 'RWF', maximumFractionDigits: 0,
});

const MANAGEMENT_ROLES: UserRole[] = ['Owner', 'Admin', 'Property Manager'];

type Tab = 'orders' | 'setup';

// ─── shared input styles ────────────────────────────────────────────────────
const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none ' +
  'ring-lime-700 transition placeholder:text-slate-400 focus:ring-2 ' +
  'dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const selectCls = inputCls + ' cursor-pointer';

// ─── Root page ──────────────────────────────────────────────────────────────
export function RestaurantPage() {
  const { user } = useAuth();
  const canManage = MANAGEMENT_ROLES.includes(user?.role as UserRole);
  const [tab, setTab] = useState<Tab>('orders');
  const [propertyId, setPropertyId] = useState('');

  const propertiesQuery = useQuery({ queryKey: ['properties'], queryFn: getProperties });
  const menuItemsQuery  = useQuery({
    queryKey: ['menu-items', propertyId],
    queryFn: () => listMenuItems({ propertyId: propertyId || undefined, limit: 100 }),
  });
  const ordersQuery = useQuery({
    queryKey: ['restaurant-orders', propertyId],
    queryFn: () => listOrders({ propertyId: propertyId || undefined, limit: 50 }),
  });
  const guestsQuery = useQuery({
    queryKey: ['restaurant-guests', propertyId],
    queryFn: () => listGuests({ propertyId: propertyId || undefined, limit: 100 }),
    enabled: Boolean(propertyId),
  });
  const roomsQuery = useQuery({
    queryKey: ['restaurant-rooms', propertyId],
    queryFn: () => listRooms({ propertyId: propertyId || undefined, status: 'Occupied', limit: 100 }),
    enabled: Boolean(propertyId),
  });

  return (
    <div>
      <PageHeader
        title="Restaurant"
        breadcrumb={['Workspace', 'Restaurant']}
        actions={
          <span className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-800">
            <QrCode className="h-4 w-4 text-lime-700" />
            QR ordering ready
          </span>
        }
      />

      {/* ── Property filter + Tab switcher ── */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <TabBtn active={tab === 'orders'} onClick={() => setTab('orders')}>
            <Utensils className="h-4 w-4" /> Take Orders
          </TabBtn>
          {canManage && (
            <TabBtn active={tab === 'setup'} onClick={() => setTab('setup')}>
              <Settings2 className="h-4 w-4" /> Setup & Menu
            </TabBtn>
          )}
        </div>
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-lime-700 focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
        >
          <option value="">All properties</option>
          {propertiesQuery.data?.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* ── Tab panels ── */}
      <AnimatePresence mode="wait">
        {tab === 'orders' && (
          <motion.div key="orders"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}
          >
            <TakeOrdersTab
              propertyId={propertyId}
              setPropertyId={setPropertyId}
              properties={propertiesQuery.data ?? []}
              menuItems={menuItemsQuery.data?.items ?? []}
              menuLoading={menuItemsQuery.isLoading}
              orders={ordersQuery.data?.items ?? []}
              ordersLoading={ordersQuery.isLoading}
              guests={guestsQuery.data?.items ?? []}
              rooms={roomsQuery.data?.items ?? []}
            />
          </motion.div>
        )}
        {tab === 'setup' && canManage && (
          <motion.div key="setup"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}
          >
            <SetupTab
              properties={propertiesQuery.data ?? []}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab 1: Take Orders ──────────────────────────────────────────────────────
function TakeOrdersTab({
  propertyId, setPropertyId, properties,
  menuItems, menuLoading,
  orders, ordersLoading,
  guests, rooms,
}: {
  propertyId: string;
  setPropertyId: (id: string) => void;
  properties: Array<{ _id: string; name: string }>;
  menuItems: MenuItem[];
  menuLoading: boolean;
  orders: RestaurantOrder[];
  ordersLoading: boolean;
  guests: Array<{ _id: string; fullName: string }>;
  rooms: Array<{ _id: string; roomNumber: string }>;
}) {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [qty, setQty] = useState(1);
  const orderFormRef = useRef<HTMLFormElement>(null);

  const orderMutation = useMutation({
    mutationFn: createStaffOrder,
    onSuccess: () => {
      toast.success('Order sent to kitchen!');
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      setSelectedItem(null);
      setQty(1);
      orderFormRef.current?.reset();
    },
    onError: (err: unknown) => {
      type E = { response?: { data?: { message?: string } } };
      const msg = (err as E)?.response?.data?.message
        ?? 'Could not place order. Guest must be checked in with an open folio.';
      toast.error(msg);
    },
  });

  function handleOrderSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedItem) { toast.error('Select a menu item first'); return; }
    const fd = new FormData(e.currentTarget);
    const roomIdRaw = String(fd.get('roomId') ?? '').trim();
    orderMutation.mutate({
      propertyId: String(fd.get('propertyId')),
      guestId:    String(fd.get('guestId')),
      // only send roomId if it's a real non-empty value
      roomId:     roomIdRaw || undefined,
      items: [{ menuItemId: selectedItem._id, quantity: qty }],
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      {/* ── LEFT: Menu card grid ── */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
          <ChefHat className="h-5 w-5 text-lime-700" /> Menu
        </h2>
        {menuLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : menuItems.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {menuItems.map((item) => (
              <MenuCard
                key={item._id}
                item={item}
                selected={selectedItem?._id === item._id}
                onClick={() => { setSelectedItem(item); setQty(1); }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No menu items yet"
            message="Switch to Setup & Menu tab to add dishes and categories."
          />
        )}
      </div>

      {/* ── RIGHT: Order panel + live orders ── */}
      <div className="flex flex-col gap-6">
        {/* Order form */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <ShoppingCart className="h-5 w-5 text-lime-700" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Place Order</h2>
          </div>
          <form ref={orderFormRef} onSubmit={handleOrderSubmit} className="space-y-4 p-5">
            {/* Selected item preview */}
            <div className={`rounded-xl border-2 px-4 py-3 text-sm transition-colors ${
              selectedItem
                ? 'border-lime-400 bg-lime-50 dark:border-lime-700 dark:bg-lime-950/40'
                : 'border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/30'
            }`}>
              {selectedItem ? (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedItem.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {money.format(selectedItem.price)} · {selectedItem.preparationMinutes} min prep
                    </p>
                  </div>
                  <button type="button" onClick={() => setSelectedItem(null)}
                    className="text-xs font-semibold text-red-500 hover:text-red-600">
                    Clear
                  </button>
                </div>
              ) : (
                <p className="text-center text-slate-400 dark:text-slate-500">
                  ← Click a menu item to select it
                </p>
              )}
            </div>

            {/* Qty stepper */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Quantity</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-lg font-bold transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                  −
                </button>
                <span className="w-10 text-center text-lg font-semibold text-slate-900 dark:text-white">{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-lg font-bold transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                  +
                </button>
                {selectedItem && (
                  <span className="ml-auto text-sm font-semibold text-lime-700 dark:text-lime-400">
                    = {money.format(selectedItem.price * qty)}
                  </span>
                )}
              </div>
            </div>

            <OField label="Property" required>
              <select name="propertyId" required value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)} className={selectCls}>
                <option value="">Select property…</option>
                {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </OField>

            <OField label="Guest (checked-in)" required>
              <select name="guestId" required className={selectCls} disabled={!propertyId || guestsQuery.isLoading}>
                <option value="">
                  {!propertyId
                    ? 'Select property first'
                    : guestsQuery.isLoading
                    ? 'Loading guests…'
                    : (guests.length === 0 ? 'No checked-in guests found' : 'Select guest…')}
                </option>
                {guests.map((g) => <option key={g._id} value={g._id}>{g.fullName}</option>)}
              </select>
            </OField>

            <OField label="Room (optional)">
              <select name="roomId" className={selectCls} disabled={!propertyId}>
                <option value="">No room / dine-in</option>
                {rooms.map((r) => <option key={r._id} value={r._id}>Room {r.roomNumber}</option>)}
              </select>
            </OField>

            <button type="submit" disabled={orderMutation.isPending || !selectedItem}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-700 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition hover:bg-lime-800 disabled:opacity-50">
              {orderMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>
                : <><ShoppingCart className="h-4 w-4" />Send to Kitchen</>}
            </button>
          </form>
        </div>

        {/* Live orders list */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <Clock className="h-5 w-5 text-lime-700" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Live Orders</h2>
            {orders.length > 0 && (
              <span className="ml-auto rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-bold text-lime-700 dark:bg-lime-950 dark:text-lime-300">
                {orders.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {ordersLoading ? (
              <div className="p-5"><Skeleton className="h-20" /></div>
            ) : orders.length ? (
              orders.slice(0, 8).map((order) => (
                <div key={order._id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      #{order.orderNumber}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-slate-900 dark:text-white">
                      {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {money.format(order.totalAmount)}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
              ))
            ) : (
              <p className="px-5 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                No orders yet today.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Setup & Menu Management ─────────────────────────────────────────
function SetupTab({ properties }: { properties: Array<{ _id: string; name: string }> }) {
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ['menu-categories'], queryFn: listMenuCategories });

  const categoryMutation = useMutation({
    mutationFn: createMenuCategory,
    onSuccess: (_, vars) => {
      toast.success(`Category "${vars.name}" created`);
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
    },
    onError: () => toast.error('Could not create category'),
  });

  const itemMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: (_, vars) => {
      toast.success(`"${vars.name}" added to menu`);
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
    onError: () => toast.error('Could not create menu item'),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* ── New Category ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <Plus className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">New Category</h2>
        </div>
        <form
          className="space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            categoryMutation.mutate({
              propertyId:   String(fd.get('propertyId')),
              name:         String(fd.get('name')),
              description:  String(fd.get('description') ?? ''),
              displayOrder: Number(fd.get('displayOrder') || 0),
            });
            e.currentTarget.reset();
          }}
        >
          <OField label="Property" required>
            <select name="propertyId" required className={selectCls}>
              <option value="">Select property…</option>
              {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </OField>
          <OField label="Category Name" required>
            <input name="name" required placeholder="e.g. Main Course" className={inputCls} />
          </OField>
          <OField label="Description">
            <input name="description" placeholder="Short description (optional)" className={inputCls} />
          </OField>
          <OField label="Display Order">
            <input name="displayOrder" type="number" min="0" defaultValue="0" placeholder="0" className={inputCls} />
          </OField>
          <button type="submit" disabled={categoryMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
            {categoryMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
              : <><Plus className="h-4 w-4" />Save Category</>}
          </button>
        </form>
      </div>

      {/* ── New Menu Item ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-lime-50 dark:bg-lime-950">
            <ChefHat className="h-4 w-4 text-lime-700 dark:text-lime-300" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">New Menu Item</h2>
        </div>
        <form
          className="space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            itemMutation.mutate({
              propertyId:         String(fd.get('propertyId')),
              categoryId:         String(fd.get('categoryId')),
              name:               String(fd.get('name')),
              description:        String(fd.get('description') ?? ''),
              price:              Number(fd.get('price')),
              preparationMinutes: Number(fd.get('preparationMinutes') || 20),
              isAvailable:        true,
            });
            e.currentTarget.reset();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <OField label="Property" required>
              <select name="propertyId" required className={selectCls}>
                <option value="">Select property…</option>
                {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </OField>
            <OField label="Category" required>
              <select name="categoryId" required className={selectCls}>
                <option value="">Select category…</option>
                {categoriesQuery.data?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </OField>
          </div>
          <OField label="Item Name" required>
            <input name="name" required placeholder="e.g. Grilled Chicken Plate" className={inputCls} />
          </OField>
          <OField label="Description">
            <input name="description" placeholder="Short description (optional)" className={inputCls} />
          </OField>
          <div className="grid gap-4 sm:grid-cols-2">
            <OField label="Price (RWF)" required>
              <input name="price" required type="number" min="0" placeholder="e.g. 18000" className={inputCls} />
            </OField>
            <OField label="Prep Time (minutes)">
              <input name="preparationMinutes" type="number" min="0" defaultValue="20" placeholder="20" className={inputCls} />
            </OField>
          </div>
          <button type="submit" disabled={itemMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-700 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-700/20 transition hover:bg-lime-800 disabled:opacity-50">
            {itemMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
              : <><Plus className="h-4 w-4" />Save Menu Item</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── MenuCard ────────────────────────────────────────────────────────────────
function MenuCard({
  item,
  selected,
  onClick,
}: {
  item: MenuItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-2xl border-2 p-4 text-left transition-colors ${
        selected
          ? 'border-lime-500 bg-lime-50 shadow-lg shadow-lime-200/50 dark:border-lime-600 dark:bg-lime-950/40 dark:shadow-none'
          : 'border-slate-200/80 bg-white hover:border-lime-300 hover:bg-lime-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-lime-800'
      } ${!item.isAvailable ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-semibold leading-tight ${
          selected ? 'text-lime-800 dark:text-lime-200' : 'text-slate-900 dark:text-white'
        }`}>
          {item.name}
        </p>
        {!item.isAvailable && (
          <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            Unavailable
          </span>
        )}
      </div>
      {item.description && (
        <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-base font-bold ${selected ? 'text-lime-700 dark:text-lime-400' : 'text-slate-900 dark:text-white'}`}>
          {money.format(item.price)}
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
          <Clock className="h-3 w-3" />
          {item.preparationMinutes}m
        </span>
      </div>
    </motion.button>
  );
}

// ─── OrderStatusBadge ────────────────────────────────────────────────────────
function OrderStatusBadge({ status }: { status: RestaurantOrder['status'] }) {
  const styles: Record<RestaurantOrder['status'], string> = {
    Received:  'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
    Preparing: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-900',
    Ready:     'bg-lime-50 text-lime-700 ring-lime-200 dark:bg-lime-950 dark:text-lime-300 dark:ring-lime-900',
    Delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
    Cancelled: 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-950 dark:text-red-400',
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${styles[status]}`}>
      {status}
    </span>
  );
}

// ─── OField ──────────────────────────────────────────────────────────────────
function OField({
  label, required, children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── TabBtn ───────────────────────────────────────────────────────────────────
function TabBtn({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-white'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
