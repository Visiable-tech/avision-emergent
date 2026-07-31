/**
 * Category context — the currently selected exam category drives all content filtering.
 * Persisted locally + synced to backend for logged-in users.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';

const CAT_KEY = 'avision_category_id';

export type Category = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  banner?: string;
  status?: string;
  display_order?: number;
  subtitle?: string;
  exams?: any[];
};

type Ctx = {
  categoryId: string | null;
  category: Category | null;
  categories: Category[];
  loading: boolean;
  setCategoryId: (id: string, syncBackend?: boolean) => Promise<void>;
  refreshCategories: () => Promise<void>;
};

const CategoryContext = createContext<Ctx>({
  categoryId: null, category: null, categories: [], loading: true,
  setCategoryId: async () => {}, refreshCategories: async () => {},
});

async function loadStored(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return window.localStorage.getItem(CAT_KEY);
    return await SecureStore.getItemAsync(CAT_KEY);
  } catch { return null; }
}
async function storeCat(id: string | null) {
  try {
    if (Platform.OS === 'web') {
      if (id) window.localStorage.setItem(CAT_KEY, id);
      else window.localStorage.removeItem(CAT_KEY);
    } else {
      if (id) await SecureStore.setItemAsync(CAT_KEY, id);
      else await SecureStore.deleteItemAsync(CAT_KEY);
    }
  } catch {}
}

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categoryId, setCategoryIdState] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCategories = useCallback(async () => {
    try {
      const r: any = await api.activeCategories();
      setCategories(r.categories);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      await refreshCategories();
      const stored = await loadStored();
      if (stored) setCategoryIdState(stored);
      setLoading(false);
    })();
  }, [refreshCategories]);

  const setCategoryId = useCallback(async (id: string, syncBackend = false) => {
    setCategoryIdState(id);
    await storeCat(id);
    if (syncBackend) {
      try { await api.updateCategory(id); } catch {}
    }
  }, []);

  const category = categoryId ? (categories.find((c) => c.id === categoryId) || null) : null;

  return (
    <CategoryContext.Provider value={{ categoryId, category, categories, loading, setCategoryId, refreshCategories }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory() { return useContext(CategoryContext); }
