import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { refreshStoredSession } from '../../services/apiClient';
import type { CurrentUser } from '../../types/api';

function clearLocalSession() {
  localStorage.removeItem('hms.accessToken');
  localStorage.removeItem('hms.refreshToken');
  localStorage.removeItem('hms.user');
}

type AuthContextValue = {
  user: CurrentUser | null;
  accessToken: string | null;
  isInitializing: boolean;
  signIn: (payload: { user: CurrentUser; accessToken: string; refreshToken: string }) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    const stored = localStorage.getItem('hms.user');
    return stored ? (JSON.parse(stored) as CurrentUser) : null;
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('hms.accessToken'));

  // isInitializing is true whenever we have ANY stored token (access or refresh)
  // so we always verify on startup rather than trusting localStorage blindly
  const [isInitializing, setIsInitializing] = useState(() => {
    return Boolean(localStorage.getItem('hms.accessToken') ?? localStorage.getItem('hms.refreshToken'));
  });

  useEffect(() => {
    if (!isInitializing) return;

    let isMounted = true;

    refreshStoredSession()
      .then((session) => {
        if (!isMounted || !session) return;
        setAccessToken(session.accessToken);
        setUser(session.user);
      })
      .catch(() => {
        if (!isMounted) return;
        // Stale/expired tokens — wipe them so the user starts fresh on the landing page
        clearLocalSession();
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsInitializing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isInitializing]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isInitializing,
      signIn: (payload) => {
        localStorage.setItem('hms.accessToken', payload.accessToken);
        localStorage.setItem('hms.refreshToken', payload.refreshToken);
        localStorage.setItem('hms.user', JSON.stringify(payload.user));
        setAccessToken(payload.accessToken);
        setUser(payload.user);
        setIsInitializing(false);
      },
      signOut: () => {
        localStorage.removeItem('hms.accessToken');
        localStorage.removeItem('hms.refreshToken');
        localStorage.removeItem('hms.user');
        setAccessToken(null);
        setUser(null);
        setIsInitializing(false);
      }
    }),
    [accessToken, isInitializing, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
