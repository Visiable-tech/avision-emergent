import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';
import { getToken, setToken } from './tokenStore';

export type User = {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  course_id?: string;
  auth_provider?: string;
  coins?: number;
  xp?: number;
  streak?: number;
  level?: number;
  referral_code?: string;
};

type Ctx = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signInWithToken: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({
  user: null,
  loading: true,
  refresh: async () => {},
  signInWithToken: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      await setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signInWithToken = useCallback(async (token: string, u: User) => {
    await setToken(token);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    try { await api.logout(); } catch {}
    await setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, signInWithToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
