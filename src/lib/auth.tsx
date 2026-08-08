import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { clearDisposableCacheIfStorageIsFull } from './storage';

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
  };

  useEffect(() => {
    clearDisposableCacheIfStorageIsFull();
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ loading, session, user: session?.user ?? null, refresh }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
