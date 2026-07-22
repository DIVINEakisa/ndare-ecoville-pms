import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../features/auth/AuthProvider';

type PropertyContextValue = {
  activePropertyId: string;          // '' = All properties
  setActivePropertyId: (id: string) => void;
};

const PropertyContext = createContext<PropertyContextValue | null>(null);

export function PropertyProvider({ children }: { children: ReactNode }) {
  // Persist the last-selected property across navigation via sessionStorage
  const [activePropertyId, setActivePropertyIdState] = useState<string>(() => {
    return sessionStorage.getItem('pms.activeProperty') ?? '';
  });

  const { user } = useAuth();

  // On first load, if sessionStorage has no selection, seed it from the user's
  // assigned property so roles without the property selector (e.g. Department
  // Staff, Housekeeper) always have a propertyId available for API calls.
  useEffect(() => {
    if (!activePropertyId && user) {
      const fallback =
        user.activePropertyId ??
        (user.assignedPropertyIds?.[0] as string | undefined);
      if (fallback) {
        sessionStorage.setItem('pms.activeProperty', fallback);
        setActivePropertyIdState(fallback);
      }
    }
  }, [user, activePropertyId]);

  function setActivePropertyId(id: string) {
    sessionStorage.setItem('pms.activeProperty', id);
    setActivePropertyIdState(id);
  }

  const value = useMemo<PropertyContextValue>(
    () => ({ activePropertyId, setActivePropertyId }),
    [activePropertyId]
  );

  return <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>;
}

export function useProperty() {
  const ctx = useContext(PropertyContext);
  if (!ctx) throw new Error('useProperty must be used within PropertyProvider');
  return ctx;
}
