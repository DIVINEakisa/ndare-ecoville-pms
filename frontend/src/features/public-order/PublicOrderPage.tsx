import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  UtensilsCrossed,
  User,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  fetchPublicMenu,
  placePublicOrder,
  pollOrderStatus,
  type PlacedOrder,
  type PublicMenuItem,
} from "./publicOrderApi";
import { useGuestSession } from "./useGuestSession";

const money = new Intl.NumberFormat("en-RW", {
  style: "currency",
  currency: "RWF",
  maximumFractionDigits: 0,
});

// Keep the type alias local so child components still compile
type GuestInfo = {
  guestName: string;
  locationType: "room" | "table";
  locationNumber: string;
};

type CartMap = Record<string, number>;

// ─── Page root ────────────────────────────────────────────────────────────────
export function PublicOrderPage() {
  const { propertyId = "" } = useParams<{ propertyId: string }>();
  const [searchParams] = useSearchParams();

  // Support both the original ?type=room&number=101 format AND the new batch
  // QR format: ?venue=Main+Restaurant&table=5  or  ?room=101
  // New params take precedence; legacy params are kept as fallback.
  const venueParam  = searchParams.get("venue")  ?? "";
  const tableParam  = searchParams.get("table")  ?? "";
  const roomParam   = searchParams.get("room")   ?? "";
  const legacyType  = searchParams.get("type")   ?? "";
  const legacyNum   = searchParams.get("number") ?? "";

  // Resolve type + number from whichever format was used
  const rawType: string = tableParam ? "table" : roomParam ? "room" : legacyType || "room";
  const rawNumber: string = tableParam || roomParam || legacyNum;

  // Persist venue/table/room context to sessionStorage so it survives refreshes
  useEffect(() => {
    if (!propertyId) return;
    const ctx: Record<string, string> = {};
    if (venueParam)  ctx.venue  = venueParam;
    if (tableParam)  ctx.table  = tableParam;
    if (roomParam)   ctx.room   = roomParam;
    if (Object.keys(ctx).length > 0) {
      try {
        sessionStorage.setItem(
          `pms.qr.context.${propertyId}`,
          JSON.stringify({ ...ctx, savedAt: Date.now() })
        );
      } catch { /* storage quota exceeded */ }
    }
  }, [propertyId, venueParam, tableParam, roomParam]);

  // Single hook manages all persistence — replaces all the scattered useState calls
  const session = useGuestSession(propertyId, rawType, rawNumber);

  const {
    step,
    guestInfo,
    cart,
    placedOrder,
    urlType,
    urlNumber,
    hasUrlLocation,
    confirmGuestInfo,
    updateCart,
    confirmOrder,
    goToStep,
    clearSession,
  } = session;

  const [orderError, setOrderError] = useState<string | null>(null);

  const menuQuery = useQuery({
    queryKey: ["public-menu", propertyId],
    queryFn: () => fetchPublicMenu(propertyId),
    enabled: Boolean(propertyId),
    staleTime: 1000 * 60 * 5,
  });

  const allItems = useMemo(
    () => menuQuery.data?.menu.flatMap((c) => c.items) ?? [],
    [menuQuery.data],
  );

  const cartTotal = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [id, qty]) => {
        const item = allItems.find((i) => i._id === id);
        return sum + (item ? item.price * qty : 0);
      }, 0),
    [cart, allItems],
  );

  const cartCount = useMemo(
    () => Object.values(cart).reduce((s, q) => s + q, 0),
    [cart],
  );

  // ── Cart updater ────────────────────────────────────────────────────────────
  function setQty(itemId: string, delta: number) {
    updateCart((prev) => {
      const next = Math.max(0, (prev[itemId] ?? 0) + delta);
      if (next === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  }

  // ── Order submission ────────────────────────────────────────────────────────
  async function handlePlaceOrder() {
    if (!guestInfo || cartCount === 0) return;
    const items = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([menuItemId, quantity]) => ({ menuItemId, quantity }));

    setOrderError(null);
    try {
      const order = await placePublicOrder(propertyId, { ...guestInfo, items });
      confirmOrder(order); // persists order + clears cart via hook
    } catch (err: unknown) {
      type ErrResponse = {
        response?: {
          status?: number;
          data?: {
            message?: string;
            code?: string;
            details?: {
              fieldErrors?: Record<string, string[]>;
              formErrors?: string[];
            };
          };
        };
      };
      const axiosErr = err as ErrResponse;
      const data = axiosErr?.response?.data;
      let msg: string;
      if (!axiosErr?.response) {
        msg = "Could not reach the server. Please wait a moment and try again.";
      } else if (data?.code === "VALIDATION_ERROR") {
        const fieldErrors = data.details?.fieldErrors ?? {};
        const formErrors = data.details?.formErrors ?? [];
        const allMsgs = [
          ...formErrors,
          ...Object.entries(fieldErrors).flatMap(([field, errors]) =>
            errors.map((e) => `${field.replace(/^body\./, "")}: ${e}`),
          ),
        ];
        msg =
          allMsgs.length > 0
            ? allMsgs.join(" · ")
            : (data.message ?? "Validation failed");
      } else {
        msg = data?.message ?? "Could not place order. Please try again.";
      }
      setOrderError(msg);
    }
  }

  if (!propertyId) return <InvalidLink />;

  const propertyName = menuQuery.data?.property.name ?? "Ndare Ecoville";

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
          {step === "menu" && guestInfo && (
            <button
              onClick={() => goToStep("checkin")}
              className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {hasUrlLocation ? "Change name" : "Change info"}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-40 pt-6">
        <AnimatePresence mode="wait">
          {step === "checkin" && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <CheckInStep
                loading={menuQuery.isLoading}
                propertyName={propertyName}
                urlType={hasUrlLocation ? urlType : undefined}
                urlNumber={hasUrlLocation ? urlNumber : undefined}
                urlVenue={venueParam || undefined}
                savedOrder={
                  placedOrder &&
                  placedOrder.status !== "Delivered" &&
                  placedOrder.status !== "Cancelled"
                    ? placedOrder
                    : null
                }
                onConfirm={confirmGuestInfo}
                onViewSavedOrder={() => goToStep("confirmed")}
              />
            </motion.div>
          )}

          {step === "menu" && guestInfo && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
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
                onClearError={() => setOrderError(null)}
              />
            </motion.div>
          )}

          {step === "confirmed" && placedOrder && (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <ConfirmedStep
                order={placedOrder}
                onClearSession={clearSession}
              />
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
  urlVenue,
  savedOrder,
  onConfirm,
  onViewSavedOrder,
}: {
  loading: boolean;
  propertyName?: string;
  urlType?: "room" | "table";
  urlNumber?: string;
  urlVenue?: string;
  savedOrder: PlacedOrder | null;
  onConfirm: (info: GuestInfo) => void;
  onViewSavedOrder: () => void;
}) {
  const [guestName, setGuestName] = useState("");
  const [locationType, setLocationType] = useState<"room" | "table">(
    urlType ?? "room",
  );
  const [locationNumber, setLocationNumber] = useState(urlNumber ?? "");
  const nameRef = useRef<HTMLInputElement>(null);

  const isAutoMode = Boolean(urlType && urlNumber);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guestName.trim() || !locationNumber.trim()) return;
    onConfirm({
      guestName: guestName.trim(),
      locationType,
      locationNumber: locationNumber.trim(),
    });
  }

  return (
    <div>
      {/* ── Active order banner — shown when guest returns after placing an order ── */}
      {savedOrder &&
        savedOrder.status !== "Delivered" &&
        savedOrder.status !== "Cancelled" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 overflow-hidden rounded-2xl border border-lime-700/50 bg-lime-900/20"
          >
            <div className="flex items-start gap-3 px-4 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-700/30 text-xl">
                👨‍🍳
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-lime-300">
                  You have an active order
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Order{" "}
                  <span className="font-semibold text-lime-400">
                    {savedOrder.orderNumber}
                  </span>{" "}
                  · {savedOrder.locationType} {savedOrder.locationNumber}
                </p>
                <p className="mt-0.5 text-xs capitalize text-slate-500">
                  Status:{" "}
                  <span className="font-semibold text-white">
                    {savedOrder.status}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onViewSavedOrder}
              className="flex w-full items-center justify-center gap-2 border-t border-lime-700/30 bg-lime-900/30 py-3 text-sm font-bold text-lime-300 transition hover:bg-lime-900/50"
            >
              <Clock className="h-4 w-4" /> Check order progress →
            </button>
          </motion.div>
        )}

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-700/20 ring-1 ring-lime-700/40">
          <UtensilsCrossed className="h-8 w-8 text-lime-400" />
        </div>

        {isAutoMode ? (
          <>
            <h1 className="text-2xl font-black text-white">
              Welcome to {propertyName ?? "Ndare Ecoville"}!
            </h1>
            {/* Show exactly where the order will be delivered, derived from the URL */}
            <div className="mt-3 inline-flex flex-col items-center gap-1.5 rounded-2xl border border-lime-800/60 bg-lime-900/20 px-4 py-3">
              {urlVenue && (
                <span className="text-xs font-semibold uppercase tracking-wider text-lime-500">
                  {urlVenue}
                </span>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-lime-500" />
                <span className="text-sm font-semibold capitalize text-lime-300">
                  {locationType === "table" ? "Table" : "Room"} {locationNumber}
                </span>
              </div>
            </div>
            <p className="mt-3 text-slate-400">
              Just tell us your name and we'll bring your order right to you.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-white">
              Welcome{propertyName ? ` to ${propertyName}` : ""}!
            </h1>
            <p className="mt-2 text-slate-400">
              Tell us who you are and where you're sitting so we can bring your
              order right to you.
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
                {(["room", "table"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLocationType(type)}
                    className={`flex-1 rounded-2xl border py-3.5 text-sm font-bold capitalize transition ${
                      locationType === type
                        ? "border-lime-500 bg-lime-700/30 text-lime-300"
                        : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    {type === "room" ? "🛏 Room" : "🍽 Table"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <MapPin className="h-4 w-4 text-lime-500" />
                {locationType === "room" ? "Room Number" : "Table Number"}
              </label>
              <input
                required
                value={locationNumber}
                onChange={(e) => setLocationNumber(e.target.value)}
                placeholder={locationType === "room" ? "e.g. 101" : "e.g. 5"}
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
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Loading menu…
            </>
          ) : (
            <>
              <ChefHat className="h-5 w-5" /> See the Menu
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Step 2: Menu ─────────────────────────────────────────────────────────────
function MenuStep({
  categories,
  loading,
  cart,
  cartTotal,
  cartCount,
  guestInfo,
  orderError,
  onSetQty,
  onPlaceOrder,
  onClearError,
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
  onClearError: () => void;
}) {
  const [placing, setPlacing] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // Scroll the error banner into view whenever a new error appears
  useEffect(() => {
    if (orderError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [orderError]);

  async function handlePlace() {
    setPlacing(true);
    try {
      await onPlaceOrder();
    } catch {
      /* error surfaced via orderError prop */
    } finally {
      setPlacing(false);
    }
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
        <p className="font-semibold text-slate-300">
          No menu items available right now.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Please ask a staff member for assistance.
        </p>
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
          <p className="text-sm font-semibold text-white">
            {guestInfo.guestName}
          </p>
          <p className="text-xs text-lime-400 capitalize">
            {guestInfo.locationType} {guestInfo.locationNumber}
          </p>
        </div>
      </div>

      {/* Error banner — always visible if order failed */}
      {orderError && (
        <motion.div
          ref={errorRef}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-2xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-sm font-semibold text-red-300"
        >
          <div className="flex items-start justify-between gap-3">
            <span>⚠️ {orderError}</span>
            <button
              onClick={onClearError}
              aria-label="Dismiss error"
              className="shrink-0 text-red-400 hover:text-red-200 transition-colors text-base leading-none"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}

      {/* Category sections */}
      <div className="space-y-8">
        {categories.map(
          (cat) =>
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
            ),
        )}
      </div>

      {/* Floating cart bar */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-50 px-4 pb-6"
          >
            <div className="mx-auto max-w-2xl">
              <div className="rounded-2xl border border-lime-700/50 bg-slate-900 p-4 shadow-2xl shadow-black/60 ring-1 ring-white/5">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-slate-300">
                    <ShoppingCart className="h-4 w-4 text-lime-500" />
                    {cartCount} item{cartCount !== 1 ? "s" : ""} selected
                  </span>
                  <span className="font-bold text-white">
                    {money.format(cartTotal)}
                  </span>
                </div>
                <button
                  onClick={handlePlace}
                  disabled={placing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-700 py-3.5 text-base font-bold text-white shadow-lg shadow-lime-900/40 transition hover:bg-lime-600 disabled:opacity-50"
                >
                  {placing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Placing
                      order…
                    </>
                  ) : (
                    <>
                      <ChefHat className="h-5 w-5" /> Place Order ·{" "}
                      {money.format(cartTotal)}
                    </>
                  )}
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
  item,
  qty,
  onAdd,
  onRemove,
}: {
  item: PublicMenuItem;
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
        qty > 0
          ? "border-lime-700/60 bg-lime-900/20"
          : "border-white/8 bg-white/4 hover:border-white/15"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white">{item.name}</p>
        {item.description && (
          <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">
            {item.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-3">
          <span className="text-sm font-bold text-lime-400">
            {money.format(item.price)}
          </span>
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
        <span
          className={`w-7 text-center text-base font-bold transition ${qty > 0 ? "text-lime-400" : "text-slate-500"}`}
        >
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
function ConfirmedStep({
  order,
  onClearSession,
}: {
  order: PlacedOrder;
  onClearSession: () => void;
}) {
  const [status, setStatus] = useState(order.status);
  const [checkModalOpen, setCheckModal] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { status: latest } = await pollOrderStatus(order.orderId);
        setStatus(latest);
        if (latest === "Delivered" || latest === "Cancelled") {
          onClearSession();
          clearInterval(interval);
        }
      } catch {
        /* silent */
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [order.orderId, onClearSession]);

  const stages: Array<{
    key: string;
    label: string;
    sublabel: string;
    icon: string;
  }> = [
    {
      key: "Received",
      label: "Order Received",
      sublabel: "Your order is confirmed and in the queue",
      icon: "🧾",
    },
    {
      key: "Preparing",
      label: "Being Prepared",
      sublabel: "Our chef is cooking your meal right now",
      icon: "👨‍🍳",
    },
    {
      key: "Ready",
      label: "Ready!",
      sublabel: "Your meal is ready and heading your way",
      icon: "✅",
    },
    {
      key: "Delivered",
      label: "Delivered",
      sublabel: "Your order has arrived — enjoy!",
      icon: "🎉",
    },
  ];

  const stageIndex = stages.findIndex((s) => s.key === status);
  const isCancelled = status === "Cancelled";
  const isDelivered = status === "Delivered";

  return (
    <div>
      {/* Header icon */}
      <div className="mb-6 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 16 }}
          className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl ring-4 ${
            isCancelled
              ? "bg-red-900/30 ring-red-700/50"
              : isDelivered
                ? "bg-emerald-900/30 ring-emerald-600/50"
                : "bg-lime-900/30 ring-lime-600/50"
          }`}
        >
          {isCancelled ? (
            <UtensilsCrossed className="h-12 w-12 text-red-400" />
          ) : isDelivered ? (
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          ) : (
            <ChefHat className="h-12 w-12 text-lime-400" />
          )}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-black text-white"
        >
          {isCancelled
            ? "Order Cancelled"
            : isDelivered
              ? "Enjoy your meal! 🎉"
              : stageIndex === 0
                ? "Order accepted!"
                : "Being prepared!"}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22 }}
          className="mt-1.5 text-sm text-slate-400"
        >
          {isCancelled
            ? "Please speak to a staff member for assistance."
            : isDelivered
              ? "Thank you for dining with us!"
              : stageIndex === 0
                ? "Our kitchen team is about to start on your order."
                : "Our chef is preparing your meal — it will arrive shortly."}
        </motion.p>
      </div>

      {/* Vertical progress tracker */}
      {!isCancelled && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <p className="mb-5 text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Live Order Status
          </p>
          <div>
            {stages.map((stage, i) => {
              const isDone = i < stageIndex;
              const isCurrent = i === stageIndex;
              const isLast = i === stages.length - 1;
              return (
                <div key={stage.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-base transition-all duration-500 ${
                        isDone
                          ? "border-lime-500 bg-lime-700 text-white"
                          : isCurrent
                            ? "border-lime-400 bg-lime-900/60 text-lime-300"
                            : "border-white/10 bg-white/5 text-slate-600"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      ) : isCurrent ? (
                        <motion.span
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ repeat: Infinity, duration: 1.6 }}
                        >
                          {stage.icon}
                        </motion.span>
                      ) : (
                        <span className="text-sm">{stage.icon}</span>
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`h-10 w-0.5 transition-all duration-700 ${isDone ? "bg-lime-600" : "bg-white/10"}`}
                      />
                    )}
                  </div>
                  <div className={`pt-1.5 ${isLast ? "pb-0" : "pb-6"}`}>
                    <p
                      className={`text-sm font-bold leading-tight ${isDone ? "text-lime-400" : isCurrent ? "text-white" : "text-slate-600"}`}
                    >
                      {stage.label}
                    </p>
                    {isCurrent && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-0.5 text-xs text-slate-400"
                      >
                        {stage.sublabel}
                      </motion.p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!isDelivered && (
            <p className="mt-3 text-center text-xs text-slate-600">
              Updates automatically · no need to refresh
            </p>
          )}
        </motion.div>
      )}

      {/* Order reference */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.32 }}
        className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Order Reference
        </p>
        <p className="mt-1 text-xl font-black tracking-widest text-lime-400">
          {order.orderNumber}
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-lime-600" />
          <span className="capitalize">
            Delivering to {order.locationType} {order.locationNumber}
          </span>
        </div>
      </motion.div>

      {/* Order summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.36 }}
        className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Your Order
        </p>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">
                {item.quantity}× {item.name}
              </span>
              <span className="font-semibold text-white">
                {money.format(item.total)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-bold">
            <span className="text-white">Total</span>
            <span className="text-lime-400">
              {money.format(order.totalAmount)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <button
          onClick={() => setCheckModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-lime-700/50 bg-lime-900/20 py-3.5 text-sm font-bold text-lime-300 transition hover:bg-lime-900/40"
        >
          <Clock className="h-4 w-4" /> Check order status
        </button>
        <button
          onClick={() => {
            onClearSession();
            window.location.reload();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
        >
          <Plus className="h-4 w-4" /> Place another order
        </button>
      </motion.div>

      {/* Status modal */}
      <AnimatePresence>
        {checkModalOpen && (
          <OrderStatusModal
            currentOrderId={order.orderId}
            currentOrderNumber={order.orderNumber}
            onClose={() => setCheckModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Order status modal ───────────────────────────────────────────────────────
function OrderStatusModal({
  currentOrderId,
  currentOrderNumber,
  onClose,
}: {
  currentOrderId: string;
  currentOrderNumber: string;
  onClose: () => void;
}) {
  const [inputId, setInputId] = useState(currentOrderId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string } | null>(null);
  const [searched, setSearched] = useState("");

  useEffect(() => {
    fetchStatus(currentOrderId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchStatus(id: string) {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await pollOrderStatus(id.trim());
      setResult(data);
      setSearched(id.trim());
    } catch {
      setError("Order not found. Check the reference number.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const STAGES = ["Received", "Preparing", "Ready", "Delivered"];
  const idx = result ? STAGES.indexOf(result.status) : -1;
  const statusColors: Record<string, string> = {
    Received: "border-amber-600/50 bg-amber-900/30 text-amber-300",
    Preparing: "border-blue-600/50 bg-blue-900/30 text-blue-300",
    Ready: "border-lime-600/50 bg-lime-900/30 text-lime-300",
    Delivered: "border-emerald-600/50 bg-emerald-900/30 text-emerald-300",
    Cancelled: "border-red-600/50 bg-red-900/30 text-red-300",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white">Order Status</h2>
            <p className="text-xs text-slate-500">
              Check any order by its reference number
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/10 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Search row */}
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchStatus(inputId)}
            placeholder="Paste order ID…"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-lime-600 focus:ring-2 focus:ring-lime-600/30"
          />
          <button
            onClick={() => fetchStatus(inputId)}
            disabled={loading || !inputId.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-700 text-white transition hover:bg-lime-600 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowLeft className="h-4 w-4 rotate-180" />
            )}
          </button>
        </div>

        {/* Quick-fill */}
        {inputId !== currentOrderId && (
          <button
            onClick={() => {
              setInputId(currentOrderId);
              fetchStatus(currentOrderId);
            }}
            className="mb-3 w-full rounded-xl border border-lime-800/40 bg-lime-900/20 px-3 py-2 text-xs font-semibold text-lime-400 transition hover:bg-lime-900/40"
          >
            Use current order ({currentOrderNumber})
          </button>
        )}

        {error && (
          <div className="mb-3 rounded-xl border border-red-700/40 bg-red-900/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {result && !error && (
          <motion.div
            key={searched}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${statusColors[result.status] ?? "border-white/10 bg-white/5 text-slate-300"}`}
            >
              <span className="text-sm font-semibold">Current status</span>
              <span className="text-sm font-black">{result.status}</span>
            </div>
            {result.status !== "Cancelled" && (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                {STAGES.map((s, i) => {
                  const done = i < idx;
                  const cur = i === idx;
                  const last = i === STAGES.length - 1;
                  return (
                    <div key={s} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs transition-all ${done ? "border-lime-500 bg-lime-700 text-white" : cur ? "border-lime-400 bg-lime-900/50 text-lime-300" : "border-white/10 bg-white/5 text-slate-600"}`}
                        >
                          {done ? "✓" : i + 1}
                        </div>
                        {!last && (
                          <div
                            className={`h-6 w-0.5 ${done ? "bg-lime-600" : "bg-white/10"}`}
                          />
                        )}
                      </div>
                      <p
                        className={`pt-0.5 text-sm font-semibold ${done ? "text-lime-400" : cur ? "text-white" : "text-slate-600"}`}
                      >
                        {s}
                        {cur && (
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            ← now
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-2xl border border-white/10 py-3 text-sm font-semibold text-slate-400 transition hover:bg-white/5"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Invalid link ─────────────────────────────────────────────────────────────
function InvalidLink() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center">
      <UtensilsCrossed className="mb-4 h-12 w-12 text-slate-600" />
      <h1 className="text-xl font-bold text-white">Invalid QR Link</h1>
      <p className="mt-2 text-slate-400">
        Please scan the QR code on your table or room again, or ask a staff
        member for help.
      </p>
    </div>
  );
}
