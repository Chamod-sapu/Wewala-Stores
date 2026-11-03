import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@wewala/shared';

interface AdminAuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate admin role from profiles table
  const verifyAdminProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.warn('Profile fetch error:', error);
        return null;
      }

      if (data.role !== 'admin') {
        console.warn(`User ${userId} has role "${data.role}", not "admin". Signing out.`);
        await supabase.auth.signOut();
        return null;
      }

      return data as Profile;
    } catch (err) {
      console.error('Error verifying admin profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const verified = await verifyAdminProfile(user.id);
      setProfile(verified);
      if (!verified) {
        setUser(null);
        setSession(null);
      }
    }
  }, [user, verifyAdminProfile]);

  // Initial session restoration with role verification
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const verifiedProfile = await verifyAdminProfile(session.user.id);
        if (verifiedProfile) {
          setSession(session);
          setUser(session.user);
          setProfile(verifiedProfile);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (currentSession?.user) {
        const verifiedProfile = await verifyAdminProfile(currentSession.user.id);
        if (verifiedProfile) {
          setSession(currentSession);
          setUser(currentSession.user);
          setProfile(verifiedProfile);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [verifyAdminProfile]);

  // Login handler with strict role verification
  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        return { error: authError?.message || 'Invalid credentials' };
      }

      // STRICT VERIFICATION: verify profiles.role === 'admin'
      const verifiedProfile = await verifyAdminProfile(authData.user.id);
      if (!verifiedProfile) {
        return {
          error:
            'Access denied: You do not have administrator privileges to access Wewala Desktop.',
        };
      }

      setUser(authData.user);
      setSession(authData.session);
      setProfile(verifiedProfile);
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred during login.' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAdmin: profile?.role === 'admin',
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

