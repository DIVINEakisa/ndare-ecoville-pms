import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ClipboardList, CreditCard, Send, Star, Utensils, Wifi } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { createPortalOrder, getGuestPortal } from '../restaurant/restaurantApi';

const money = new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 });

export function GuestPortalPage() {
  const { propertyId = '', roomId = '' } = useParams();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<Record<string, number>>({});
  const portal = useQuery({
    queryKey: ['guest-portal', propertyId, roomId],
    queryFn: () => getGuestPortal(propertyId, roomId),
    enabled: Boolean(propertyId && roomId)
  });
  const mutation = useMutation({
    mutationFn: createPortalOrder,
    onSuccess: () => {
      toast.success('Order sent to kitchen');
      setCart({});
      queryClient.invalidateQueries({ queryKey: ['guest-portal', propertyId, roomId] });
    },
    onError: () => toast.error('Could not send order')
  });

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, quantity]) => quantity > 0)
        .map(([menuItemId, quantity]) => ({ menuItemId, quantity })),
    [cart]
  );

  if (!propertyId || !roomId) {
    return <EmptyState title="Invalid guest portal link" message="Scan the room QR code again or contact reception." />;
  }

  if (portal.isLoading) {
    return <div className="p-4"><Skeleton className="h-96" /></div>;
  }

  if (portal.isError || !portal.data) {
    return <div className="p-4"><EmptyState title="Portal unavailable" message="This room does not currently have an active guest stay." /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-4 pb-24">
      <header className="rounded-lg bg-slate-950 p-5 text-white dark:bg-slate-900">
        <p className="text-sm text-lime-200">Guest Portal</p>
        <h1 className="mt-2 text-2xl font-semibold">Room {portal.data.room.roomNumber}</h1>
        <p className="mt-2 text-sm text-slate-300">Order food, view your bill, and access stay information.</p>
      </header>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4" />Live bill</div>
          <p className="mt-3 text-3xl font-semibold">{money.format(portal.data.folio?.balance ?? 0)}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Outstanding balance</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 font-semibold"><Wifi className="h-4 w-4" />WiFi</div>
          <p className="mt-3 font-medium">{portal.data.wifi.network}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{portal.data.wifi.password}</p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Utensils className="h-5 w-5" />Menu</h2>
        <div className="space-y-4">
          {portal.data.menu.map((category) => (
            <div key={category._id}>
              <h3 className="mb-2 font-semibold">{category.name}</h3>
              <div className="space-y-2">
                {category.items?.map((item) => (
                  <article key={item._id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.description || `${item.preparationMinutes} min`}</p>
                      <p className="mt-1 text-sm font-semibold text-lime-800 dark:text-lime-300">{money.format(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800" onClick={() => setCart((current) => ({ ...current, [item._id]: Math.max((current[item._id] ?? 0) - 1, 0) }))}>-</button>
                      <span className="w-6 text-center">{cart[item._id] ?? 0}</span>
                      <button className="h-8 w-8 rounded-lg bg-lime-700 text-white" onClick={() => setCart((current) => ({ ...current, [item._id]: (current[item._id] ?? 0) + 1 }))}>+</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <InfoBlock icon={<ClipboardList className="h-4 w-4" />} title="House rules" lines={portal.data.houseRules} />
        <InfoBlock icon={<AlertTriangle className="h-4 w-4" />} title="Emergency" lines={portal.data.emergencyContacts.map((contact) => `${contact.label}: ${contact.phone}`)} />
        <InfoBlock icon={<Star className="h-4 w-4" />} title="Review" lines={['Share feedback with reception before checkout.']} />
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="text-sm font-medium">{cartItems.length} item types selected</p>
          <button
            disabled={!cartItems.length || mutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-lime-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
            onClick={() => mutation.mutate({ propertyId, roomId, items: cartItems })}
          >
            <Send className="h-4 w-4" />
            Send order
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ icon, title, lines }: { icon: ReactNode; title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center gap-2 font-semibold">{icon}{title}</div>
      <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
        {lines.map((line) => <p key={line}>{line}</p>)}
      </div>
    </div>
  );
}
