import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CurrentUser } from '../../types/api';

type AuthContextValue = {
  user: CurrentUser | null;
  accessToken: string | null;
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      signIn: (payload) => {
        localStorage.setItem('hms.accessToken', payload.accessToken);
        localStorage.setItem('hms.refreshToken', payload.refreshToken);
        localStorage.setItem('hms.user', JSON.stringify(payload.user));
        setAccessToken(payload.accessToken);
        setUser(payload.user);
      },
      signOut: () => {
        localStorage.removeItem('hms.accessToken');
        localStorage.removeItem('hms.refreshToken');
        localStorage.removeItem('hms.user');
        setAccessToken(null);
        setUser(null);
      }
    }),
    [accessToken, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
