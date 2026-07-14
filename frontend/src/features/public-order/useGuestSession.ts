/**
 * useGuestSession
 * ---------------
 * Custom hook that persists and restores all guest state across page
 * refreshes using a combination of sessionStorage (URL context) and
 * localStorage (step, cart, placed order).
 *
 * Storage keys are namespaced per propertyId so multiple tabs / QR
 * codes from different properties never bleed into each other.
 *
 * Lifecycle:
 *   1. QR scan       → URL params saved to sessionStorage immediately
 *   2. Guest fills name → guestInfo saved to sessionStorage
 *   3. Cart changes  → cart saved to localStorage on every update
 *   4. Order placed  → placedOrder saved, step set to 'confirmed'
 *   5. Order done    → clearSession() wipes everything
 */

import { useCallback, useEffect, useState } from 'react';
import type { PlacedOrder } from './publicOrderApi';

// ─── types ────────────────────────────────────────────────────────────────────

export type Step = 'checkin' | 'menu' | 'confirmed';

export type GuestInfo = {
  guestName:      string;
  locationType:   'room' | 'table';
  locationNumber: string;
};

export type CartMap = Record<string, number>; // menuItemId → quantity

type PersistedSession = {
  step:         Step;
  guestInfo:    GuestInfo | null;
  cart:         CartMap;
  placedOrder:  PlacedOrder | null;
  savedAt:      number;
};

// ─── constants ────────────────────────────────────────────────────────────────

/** Session expires after 8 hours so stale orders don't haunt the next guest. */
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

// ─── storage helpers ──────────────────────────────────────────────────────────

function sessionKey(propertyId: string) {
  return `pms.guest.session.${propertyId}`;
}

function urlContextKey(propertyId: string) {
  return `pms.guest.url.${propertyId}`;
}

function readSession(propertyId: string): PersistedSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(propertyId));
    if (!raw) return null;
    const parsed: PersistedSession = JSON.parse(raw);
    // Discard expired sessions
    if (Date.now() - parsed.savedAt > SESSION_TTL_MS) {
      clearPersistedSession(propertyId);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(propertyId: string, session: Omit<PersistedSession, 'savedAt'>) {
  try {
    const payload: PersistedSession = { ...session, savedAt: Date.now() };
    localStorage.setItem(sessionKey(propertyId), JSON.stringify(payload));
  } catch { /* storage quota exceeded — degrade gracefully */ }
}

function clearPersistedSession(propertyId: string) {
  try {
    localStorage.removeItem(sessionKey(propertyId));
    sessionStorage.removeItem(urlContextKey(propertyId));
  } catch { /* ignore */ }
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export type GuestSessionResult = {
  // State
  step:         Step;
  guestInfo:    GuestInfo | null;
  cart:         CartMap;
  placedOrder:  PlacedOrder | null;

  // URL context (read-only, derived from QR params)
  urlType:      'room' | 'table';
  urlNumber:    string;
  hasUrlLocation: boolean;

  // Mutators
  confirmGuestInfo: (info: GuestInfo)  => void;
  updateCart:       (updater: (prev: CartMap) => CartMap) => void;
  confirmOrder:     (order: PlacedOrder) => void;
  goToStep:         (step: Step)       => void;
  clearSession:     ()                 => void;
};

export function useGuestSession(
  propertyId: string,
  rawUrlType:   string,
  rawUrlNumber: string,
): GuestSessionResult {
  const urlType   = (rawUrlType === 'table' ? 'table' : 'room') as 'room' | 'table';
  const urlNumber = rawUrlNumber.trim();
  const hasUrlLocation = Boolean(urlNumber);

  // ── 1. Persist URL context to sessionStorage on first scan ─────────────────
  useEffect(() => {
    if (!propertyId || !hasUrlLocation) return;
    try {
      sessionStorage.setItem(
        urlContextKey(propertyId),
        JSON.stringify({ urlType, urlNumber, savedAt: Date.now() })
      );
    } catch { /* ignore */ }
  }, [propertyId, urlType, urlNumber, hasUrlLocation]);

  // ── 2. Restore persisted session on mount ──────────────────────────────────
  const existing = readSession(propertyId);

  // If there's an active confirmed order from a previous visit, jump straight
  // to the confirmed screen instead of the check-in form.
  const initialStep: Step = (() => {
    if (!existing) return 'checkin';
    if (existing.step === 'confirmed' && existing.placedOrder) {
      const done = existing.placedOrder.status === 'Delivered' ||
                   existing.placedOrder.status === 'Cancelled';
      return done ? 'checkin' : 'confirmed';
    }
    return existing.step;
  })();

  const [step,        setStep]        = useState<Step>(initialStep);
  const [guestInfo,   setGuestInfo]   = useState<GuestInfo | null>(existing?.guestInfo ?? null);
  const [cart,        setCart]        = useState<CartMap>(existing?.cart ?? {});
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(existing?.placedOrder ?? null);

  // ── 3. Write to localStorage whenever state changes ────────────────────────
  useEffect(() => {
    if (!propertyId) return;
    writeSession(propertyId, { step, guestInfo, cart, placedOrder });
  }, [propertyId, step, guestInfo, cart, placedOrder]);

  // ── Mutators ────────────────────────────────────────────────────────────────

  const confirmGuestInfo = useCallback((info: GuestInfo) => {
    setGuestInfo(info);
    setStep('menu');
  }, []);

  /**
   * Cart updater mirrors React's setState(updater) pattern so callers can do:
   *   updateCart(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
   */
  const updateCart = useCallback((updater: (prev: CartMap) => CartMap) => {
    setCart((prev) => updater(prev));
  }, []);

  const confirmOrder = useCallback((order: PlacedOrder) => {
    setPlacedOrder(order);
    setCart({});          // cart is cleared once order is placed
    setStep('confirmed');
  }, []);

  const goToStep = useCallback((s: Step) => {
    setStep(s);
  }, []);

  /**
   * Call this on successful checkout or when the guest explicitly dismisses
   * their session. Wipes localStorage + sessionStorage for this property.
   */
  const clearSession = useCallback(() => {
    setStep('checkin');
    setGuestInfo(null);
    setCart({});
    setPlacedOrder(null);
    clearPersistedSession(propertyId);
  }, [propertyId]);

  return {
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
  };
}
