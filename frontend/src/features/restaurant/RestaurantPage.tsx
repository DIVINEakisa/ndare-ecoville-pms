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
    queryFn: () => listMenuItems({ propertyId, limit: 200 }),
  });
  const ordersQuery = useQuery({
    queryKey: ['restaurant-orders', propertyId],
    queryFn: () => listOrders({ propertyId, limit: 50 }),
  });
  const guestsQuery = useQuery({
    queryKey: ['restaurant-guests', propertyId],
    queryFn: () => listGuests({ propertyId, limit: 200 }),
  });
  const roomsQuery = useQuery({
    queryKey: ['restaurant-rooms', propertyId],
    queryFn: () => listRooms({ propertyId, limit: 200 }),
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
    onError: () => toast.error('Order requires a checked-in guest with an open folio'),
  });

  function handleOrderSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedItem) { toast.error('Select a menu item first'); return; }
    const fd = new FormData(e.currentTarget);
    orderMutation.mutate({
      propertyId: String(fd.get('propertyId')),
      guestId:    String(fd.get('guestId')),
      roomId:     String(fd.get('roomId')) || undefined,
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

            <OField label="Guest" required>
              <select name="guestId" required className={selectCls} disabled={!propertyId}>
                <option value="">{propertyId ? 'Select guest…' : 'Select property first'}</option>
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
