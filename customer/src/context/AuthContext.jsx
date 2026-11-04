import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase/config';
import { passwordPolicyError } from '../utils/passwordPolicy';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const api = useMemo(() => {
    async function signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      return data.user;
    }

    async function signUp(name, email, password) {
      const policyError = passwordPolicyError(password);
      if (policyError) {
        throw new Error(policyError);
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/account`,
        },
      });
      if (error) throw error;
      return data;
    }

    async function signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }

    async function updateProfile({ name, phone }) {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: String(name || '').trim(),
          phone: String(phone || '').trim(),
        },
      });
      if (error) throw error;
      setUser(data.user);
      return data.user;
    }

    async function updatePassword(currentPassword, newPassword) {
      if (!user?.email) {
        throw new Error('Sign in again to change your password.');
      }
      const policyError = passwordPolicyError(newPassword);
      if (policyError) {
        throw new Error(policyError);
      }
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) {
        const err = new Error('Current password is incorrect.');
        err.code = 'invalid_credentials';
        throw err;
      }
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      await supabase.auth.signOut({ scope: 'others' });
      setUser(data.user);
      return data.user;
    }

    return {
      user,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      updatePassword,
    };
  }, [user, loading]);

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
