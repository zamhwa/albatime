"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string;
}

interface StoreInfo {
  id: string;
  name: string;
  role: 'owner' | 'worker';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  stores: StoreInfo[];
  currentStore: StoreInfo | null;
  setCurrentStore: (s: StoreInfo | null) => void;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshStores: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [currentStore, setCurrentStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else {
        setProfile(null);
        setStores([]);
        setCurrentStore(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (p) setProfile(p as Profile);
    await loadStores(userId);
    setLoading(false);
  };

  const loadStores = async (userId: string) => {
    // 소유한 매장
    const { data: owned } = await supabase
      .from('stores')
      .select('id, name')
      .eq('owner_id', userId);

    const ownerStores: StoreInfo[] = (owned || []).map(s => ({ id: s.id, name: s.name, role: 'owner' as const }));

    // 소속된 매장 (알바생)
    const { data: working } = await supabase
      .from('workers')
      .select('store_id, stores(id, name)')
      .eq('user_id', userId)
      .eq('status', 'active');

    const workerStores: StoreInfo[] = (working || []).map((w: any) => ({
      id: w.stores.id,
      name: w.stores.name,
      role: 'worker' as const,
    }));

    const all = [...ownerStores, ...workerStores];
    setStores(all);

    // 저장된 현재 매장 복원
    const savedStoreId = localStorage.getItem('albacheck_current_store');
    const saved = all.find(s => s.id === savedStoreId);
    if (saved) setCurrentStore(saved);
    else if (all.length === 1) setCurrentStore(all[0]);
  };

  const refreshStores = async () => {
    if (user) await loadStores(user.id);
  };

  const setCurrentStoreAndSave = (s: StoreInfo | null) => {
    setCurrentStore(s);
    if (s) localStorage.setItem('albacheck_current_store', s.id);
    else localStorage.removeItem('albacheck_current_store');
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('albacheck_current_store');
    setCurrentStore(null);
    setStores([]);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, stores, currentStore,
      setCurrentStore: setCurrentStoreAndSave,
      loading, signUp, signIn, signOut, refreshStores,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
