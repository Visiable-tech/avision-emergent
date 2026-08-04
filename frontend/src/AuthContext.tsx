import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';
import { getToken, setToken } from './tokenStore';

export type User = {
  user_id: string;
  avision_id?: string;
  roles?: string[];
  active?: boolean;
  centre_id?: string | null;
  admission_source?: string;
  counsellor_id?: string | null;
  name: string;
  email: string;
  phone?: string;
  category_id?: string;
  selected_exam_id?: string;
  language?: string;
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
  patchUser: (patch: Partial<User>) => void;
};

const AuthContext = createContext<Ctx>({
  user: null, loading: true,
  refresh: async () => {}, signInWithToken: async () => {}, signOut: async () => {},
  patchUser: () => {},
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

  const patchUser = useCallback((patch: Partial<User>) => {
    setUser((u) => (u ? { ...u, ...patch } : u));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, signInWithToken, signOut, patchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
