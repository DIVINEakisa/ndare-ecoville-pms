import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, ChefHat, Clock,
  Loader2, MapPin, Minus, Plus, ShoppingCart,
  UtensilsCrossed, User
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  fetchPublicMenu,
  placePublicOrder,
  pollOrderStatus,
  type PlacedOrder,
  type PublicMenuItem
} from './publicOrderApi';

const money = new Intl.NumberFormat('en-RW', {
  style: 'currency', currency: 'RWF', maximumFractionDigits: 0,
});

type Step = 'checkin' | 'menu' | 'confirmed';

type GuestInfo = {
  guestName:      string;
  locationType:   'room' | 'table';
  locationNumber: string;
};

type CartMap = Record<string, number>;

// ─── Page root ────────────────────────────────────────────────────────────────
export function PublicOrderPage() {
  const { propertyId = '' } = useParams<{ propertyId: string }>();
  const [searchParams] = useSearchParams();

  // Read location directly from URL query params — no manual selection needed
  const urlType   = (searchParams.get('type') ?? 'room') as 'room' | 'table';
  const urlNumber = searchParams.get('number') ?? '';

  // If the URL is missing critical params, show the full manual form as fallback
  const hasUrlLocation = Boolean(urlNumber.trim());

  const [step, setStep]               = useState<Step>('checkin');
  const [guestInfo, setGuestInfo]     = useState<GuestInfo | null>(null);
  const [cart, setCart]               = useState<CartMap>({});
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [orderError, setOrderError]   = useState<string | null>(null);

  const menuQuery = useQuery({
    queryKey: ['public-menu', propertyId],
    queryFn:  () => fetchPublicMenu(propertyId),
    enabled:  Boolean(propertyId),
    staleTime: 1000 * 60 * 5,
  });

  const allItems = useMemo(
    () => menuQuery.data?.menu.flatMap((c) => c.items) ?? [],
    [menuQuery.data]
  );

  const cartTotal = useMemo(
    () => Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = allItems.find((i) => i._id === id);
      return sum + (item ? item.price * qty : 0);
    }, 0),
    [cart, allItems]
  );

  const cartCount = useMemo(
    () => Object.values(cart).reduce((s, q) => s + q, 0),
    [cart]
  );

  function setQty(itemId: string, delta: number) {
    setCart((prev) => {
      const next = Math.max(0, (prev[itemId] ?? 0) + delta);
      if (next === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  }

  async function handlePlaceOrder() {
    if (!guestInfo || cartCount === 0) return;
    const items = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([menuItemId, quantity]) => ({ menuItemId, quantity }));

    try {
      const order = await placePublicOrder(propertyId, {
        ...guestInfo,
        items,
      });
      setPlacedOrder(order);
      setCart({});
      setStep('confirmed');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Could not place order. The server may be waking up — please try again in 30 seconds.';
      setOrderError(msg);
    }
  }

  if (!propertyId) {
    return <InvalidLink />;
  }

  const propertyName = menuQuery.data?.property.name ?? 'Ndare Ecoville';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Brand header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-700 shadow-lg shadow-lime-900/40">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-lime-400">
              {propertyName}
            </p>
            <p className="text-xs text-slate-400">Guest Ordering</p>
          </div>
          {step === 'menu' && guestInfo && hasUrlLocation && (
            <button
              onClick={() => setStep('checkin')}
              className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Change name
            </button>
          )}
          {step === 'menu' && guestInfo && !hasUrlLocation && (
            <button
              onClick={() => setStep('checkin')}
              className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Change info
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-40 pt-6">
        <AnimatePresence mode="wait">
          {step === 'checkin' && (
            <motion.div key="checkin"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
            >
              <CheckInStep
                loading={menuQuery.isLoading}
                propertyName={propertyName}
                urlType={hasUrlLocation ? urlType : undefined}
                urlNumber={hasUrlLocation ? urlNumber : undefined}
                onConfirm={(info) => { setGuestInfo(info); setStep('menu'); }}
              />
            </motion.div>
          )}

          {step === 'menu' && guestInfo && (
            <motion.div key="menu"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
            >
              <MenuStep
                categories={menuQuery.data?.menu ?? []}
                loading={menuQuery.isLoading}
                cart={cart}
                cartTotal={cartTotal}
                cartCount={cartCount}
                guestInfo={guestInfo}
                orderError={orderError}
                onSetQty={setQty}
                onPlaceOrder={handlePlaceOrder}
              />
            </motion.div>
          )}

          {step === 'confirmed' && placedOrder && (
            <motion.div key="confirmed"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <ConfirmedStep order={placedOrder} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Step 1: Check-in ─────────────────────────────────────────────────────────
function CheckInStep({
  loading,
  propertyName,
  urlType,
  urlNumber,
  onConfirm,
}: {
  loading: boolean;
  propertyName?: string;
  /** Passed when the URL already contains ?type=...&number=... — skips location fields */
  urlType?:   'room' | 'table';
  urlNumber?: string;
  onConfirm: (info: GuestInfo) => void;
}) {
  const [guestName,      setGuestName]      = useState('');
  const [locationType,   setLocationType]   = useState<'room' | 'table'>(urlType ?? 'room');
  const [locationNumber, setLocationNumber] = useState(urlNumber ?? '');
  const nameRef = useRef<HTMLInputElement>(null);

  // URL provides the location — lock it in and just ask for the name
  const isAutoMode = Boolean(urlType && urlNumber);

  useEffect(() => { nameRef.current?.focus(); }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guestName.trim() || !locationNumber.trim()) return;
    onConfirm({
      guestName:      guestName.trim(),
      locationType,
      locationNumber: locationNumber.trim(),
    });
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-700/20 ring-1 ring-lime-700/40">
          <UtensilsCrossed className="h-8 w-8 text-lime-400" />
        </div>

        {isAutoMode ? (
          <>
            <h1 className="text-2xl font-black text-white">
              Welcome to {propertyName ?? 'Ndare Ecoville'}!
            </h1>
            {/* Show exactly where the order will be delivered, derived from the URL */}
            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-lime-800/60 bg-lime-900/20 px-4 py-2">
              <MapPin className="h-4 w-4 text-lime-500" />
              <span className="text-sm font-semibold capitalize text-lime-300">
                Ordering directly to {locationType} {locationNumber}
              </span>
            </div>
            <p className="mt-3 text-slate-400">
              Just tell us your name and we'll bring your order right to you.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-white">
              Welcome{propertyName ? ` to ${propertyName}` : ''}!
            </h1>
            <p className="mt-2 text-slate-400">
              Tell us who you are and where you're sitting so we can bring your order right to you.
            </p>
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Guest name — always shown */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <User className="h-4 w-4 text-lime-500" /> Your Name
          </label>
          <input
            ref={nameRef}
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="e.g. John Doe"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white placeholder:text-slate-500 outline-none ring-lime-600 transition focus:ring-2"
          />
        </div>

        {/* Location fields — only shown when NOT auto-filled from URL */}
        {!isAutoMode && (
          <>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <MapPin className="h-4 w-4 text-lime-500" /> I'm at a…
              </label>
              <div className="flex gap-3">
                {(['room', 'table'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLocationType(type)}
                    className={`flex-1 rounded-2xl border py-3.5 text-sm font-bold capitalize transition ${
                      locationType === type
                        ? 'border-lime-500 bg-lime-700/30 text-lime-300'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    {type === 'room' ? '🛏 Room' : '🍽 Table'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <MapPin className="h-4 w-4 text-lime-500" />
                {locationType === 'room' ? 'Room Number' : 'Table Number'}
              </label>
              <input
                required
                value={locationNumber}
                onChange={(e) => setLocationNumber(e.target.value)}
                placeholder={locationType === 'room' ? 'e.g. 101' : 'e.g. 5'}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white placeholder:text-slate-500 outline-none ring-lime-600 transition focus:ring-2"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading || !guestName.trim() || !locationNumber.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-700 py-4 text-base font-bold text-white shadow-xl shadow-lime-900/40 transition hover:bg-lime-600 disabled:opacity-50"
        >
          {loading
            ? <><Loader2 className="h-5 w-5 animate-spin" /> Loading menu…</>
            : <><ChefHat className="h-5 w-5" /> See the Menu</>}
        </button>
      </form>
    </div>
  );
}

// ─── Step 2: Menu ─────────────────────────────────────────────────────────────
function MenuStep({
  categories, loading, cart, cartTotal, cartCount,
  guestInfo, orderError, onSetQty, onPlaceOrder,
}: {
  categories: Array<{ _id: string; name: string; items: PublicMenuItem[] }>;
  loading: boolean;
  cart: CartMap;
  cartTotal: number;
  cartCount: number;
  guestInfo: GuestInfo;
  orderError: string | null;
  onSetQty: (id: string, delta: number) => void;
  onPlaceOrder: () => Promise<void>;
}) {
  const [placing, setPlacing] = useState(false);

  async function handlePlace() {
    setPlacing(true);
    try { await onPlaceOrder(); }
    finally { setPlacing(false); }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
        <ChefHat className="mx-auto mb-3 h-10 w-10 text-slate-500" />
        <p className="font-semibold text-slate-300">No menu items available right now.</p>
        <p className="mt-1 text-sm text-slate-500">Please ask a staff member for assistance.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Guest context bar */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-lime-800/50 bg-lime-900/20 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-700 text-sm font-bold">
          {guestInfo.guestName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{guestInfo.guestName}</p>
          <p className="text-xs text-lime-400 capitalize">
            {guestInfo.locationType} {guestInfo.locationNumber}
          </p>
        </div>
      </div>

      {/* Category sections */}
      <div className="space-y-8">
        {categories.map((cat) => (
          cat.items.length > 0 && (
            <section key={cat._id}>
              <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-lime-500">
                {cat.name}
              </h2>
              <div className="space-y-3">
                {cat.items.map((item) => (
                  <MenuItemCard
                    key={item._id}
                    item={item}
                    qty={cart[item._id] ?? 0}
                    onAdd={() => onSetQty(item._id, +1)}
                    onRemove={() => onSetQty(item._id, -1)}
                  />
                ))}
              </div>
            </section>
          )
        ))}
      </div>

      {/* Floating cart bar */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-50 px-4 pb-6"
          >
            <div className="mx-auto max-w-2xl">
              <div className="rounded-2xl border border-lime-700/50 bg-slate-900 p-4 shadow-2xl shadow-black/60 ring-1 ring-white/5">
                {/* Error message */}
                {orderError && (
                  <div className="mb-3 rounded-xl border border-red-500/30 bg-red-900/30 px-4 py-2.5 text-center text-sm font-semibold text-red-300">
                    ⚠️ {orderError}
                  </div>
                )}
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-slate-300">
                    <ShoppingCart className="h-4 w-4 text-lime-500" />
                    {cartCount} item{cartCount !== 1 ? 's' : ''} selected
                  </span>
                  <span className="font-bold text-white">{money.format(cartTotal)}</span>
                </div>
                <button
                  onClick={handlePlace}
                  disabled={placing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-700 py-3.5 text-base font-bold text-white shadow-lg shadow-lime-900/40 transition hover:bg-lime-600 disabled:opacity-50"
                >
                  {placing
                    ? <><Loader2 className="h-5 w-5 animate-spin" /> Placing order…</>
                    : <><ChefHat className="h-5 w-5" /> Place Order · {money.format(cartTotal)}</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Menu item card ────────────────────────────────────────────────────────────
function MenuItemCard({
  item, qty, onAdd, onRemove,
}: {
  item: PublicMenuItem;
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
      qty > 0
        ? 'border-lime-700/60 bg-lime-900/20'
        : 'border-white/8 bg-white/4 hover:border-white/15'
    }`}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white">{item.name}</p>
        {item.description && (
          <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{item.description}</p>
        )}
        <div className="mt-1.5 flex items-center gap-3">
          <span className="text-sm font-bold text-lime-400">{money.format(item.price)}</span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3 w-3" /> {item.preparationMinutes}m
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRemove}
          disabled={qty === 0}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:opacity-30"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className={`w-7 text-center text-base font-bold transition ${qty > 0 ? 'text-lime-400' : 'text-slate-500'}`}>
          {qty}
        </span>
        <button
          onClick={onAdd}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-700 text-white shadow-sm transition hover:bg-lime-600"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Confirmed ────────────────────────────────────────────────────────
function ConfirmedStep({ order }: { order: PlacedOrder }) {
  const [status, setStatus] = useState(order.status);

  // Poll every 15 seconds so the status updates live without a refresh
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { status: latest } = await pollOrderStatus(order.orderId);
        setStatus(latest);
        if (latest === 'Delivered' || latest === 'Cancelled') clearInterval(interval);
      } catch { /* silent */ }
    }, 15_000);
    return () => clearInterval(interval);
  }, [order.orderId]);

  // Progress steps — each stage the guest can see
  const stages: Array<{ key: string; label: string; sublabel: string }> = [
    { key: 'Received',  label: 'Order Received',    sublabel: 'Your order is confirmed' },
    { key: 'Preparing', label: 'Being Prepared',     sublabel: 'Our chef is cooking now' },
    { key: 'Ready',     label: 'Ready!',             sublabel: 'Your order is on the way' },
    { key: 'Delivered', label: 'Delivered',          sublabel: 'Enjoy your meal!' },
  ];

  const stageIndex = stages.findIndex((s) => s.key === status);
  const currentStage = stages[stageIndex] ?? stages[0];

  const isCancelled = status === 'Cancelled';
  const isDelivered = status === 'Delivered';

  return (
    <div className="text-center">

      {/* ── Big animated confirmation icon ── */}
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 16 }}
        className={`mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-3xl ring-4 ${
          isCancelled
            ? 'bg-red-900/30 ring-red-700/50'
            : isDelivered
            ? 'bg-emerald-900/30 ring-emerald-600/50'
            : 'bg-lime-900/30 ring-lime-600/50'
        }`}
      >
        {isCancelled ? (
          <UtensilsCrossed className="h-14 w-14 text-red-400" />
        ) : isDelivered ? (
          <CheckCircle2 className="h-14 w-14 text-emerald-400" />
        ) : (
          <ChefHat className="h-14 w-14 text-lime-400" />
        )}
      </motion.div>

      {/* ── Main message ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {isCancelled ? (
          <>
            <h1 className="text-2xl font-black text-white">Order Cancelled</h1>
            <p className="mt-2 text-slate-400">
              Your order was cancelled. Please speak to a staff member for assistance.
            </p>
          </>
        ) : isDelivered ? (
          <>
            <h1 className="text-2xl font-black text-white">Enjoy your meal! 🎉</h1>
            <p className="mt-2 text-slate-400">
              Your order has been delivered. Thank you for dining with us!
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-white">
              {currentStage.key === 'Received'
                ? 'Order accepted!'
                : 'Your order is being prepared!'}
            </h1>
            <p className="mt-2 text-slate-400">
              {currentStage.key === 'Received'
                ? 'We have received your order and our kitchen team is about to start.'
                : 'Our chef is preparing your meal. It will be delivered to you shortly.'}
            </p>
          </>
        )}
      </motion.div>

      {/* ── Live status progress bar ── */}
      {!isCancelled && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Live Order Status
          </p>

          {/* Progress steps */}
          <div className="flex items-center justify-between gap-1">
            {stages.map((stage, i) => {
              const isDone    = i < stageIndex;
              const isCurrent = i === stageIndex;
              return (
                <div key={stage.key} className="flex flex-1 flex-col items-center gap-1.5">
                  {/* Step circle */}
                  <div className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                    isDone
                      ? 'border-lime-500 bg-lime-700'
                      : isCurrent
                      ? 'border-lime-400 bg-lime-900/50'
                      : 'border-white/10 bg-white/5'
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : isCurrent ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="h-2.5 w-2.5 rounded-full bg-lime-400"
                      />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-white/20" />
                    )}
                  </div>

                  {/* Connector line (not after last) */}
                  {i < stages.length - 1 && (
                    <div className="absolute" style={{ display: 'none' }} />
                  )}

                  {/* Label */}
                  <p className={`text-[10px] font-semibold leading-tight text-center ${
                    isDone ? 'text-lime-400' : isCurrent ? 'text-white' : 'text-slate-600'
                  }`}>
                    {stage.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Horizontal connector between steps */}
          <div className="relative -mt-[52px] mb-3 flex items-center px-5">
            {stages.slice(0, -1).map((_, i) => (
              <div key={i} className={`h-0.5 flex-1 transition-all duration-700 ${
                i < stageIndex ? 'bg-lime-600' : 'bg-white/10'
              }`} />
            ))}
          </div>

          {/* Current stage sublabel */}
          <div className={`mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold ${
            isDelivered
              ? 'bg-emerald-900/30 text-emerald-300'
              : 'bg-lime-900/30 text-lime-300'
          }`}>
            {currentStage.sublabel}
          </div>

          {!isDelivered && (
            <p className="mt-2 text-xs text-slate-600">
              Updates automatically · no need to refresh
            </p>
          )}
        </motion.div>
      )}

      {/* ── Order number ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-4"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Order Reference</p>
        <p className="mt-1 text-xl font-black tracking-widest text-lime-400">{order.orderNumber}</p>
      </motion.div>

      {/* ── Order summary ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-left"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Your Order</p>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{item.quantity}× {item.name}</span>
              <span className="font-semibold text-white">{money.format(item.total)}</span>
            </div>
          ))}
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-base font-bold">
            <span className="text-white">Total</span>
            <span className="text-lime-400">{money.format(order.totalAmount)}</span>
          </div>
        </div>
      </motion.div>

      {/* ── Delivery location ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400"
      >
        <MapPin className="h-4 w-4 text-lime-500" />
        Delivering to
        <span className="font-semibold capitalize text-white">
          {order.locationType} {order.locationNumber}
        </span>
      </motion.div>

      {/* ── Place another order ── */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        onClick={() => window.location.reload()}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
      >
        <Plus className="h-4 w-4" /> Place another order
      </motion.button>
    </div>
  );
}

// ─── Invalid link ─────────────────────────────────────────────────────────────
function InvalidLink() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center">
      <UtensilsCrossed className="mb-4 h-12 w-12 text-slate-600" />
      <h1 className="text-xl font-bold text-white">Invalid QR Link</h1>
      <p className="mt-2 text-slate-400">
        Please scan the QR code on your table or room again, or ask a staff member for help.
      </p>
    </div>
  );
}
