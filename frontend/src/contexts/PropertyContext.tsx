import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

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
