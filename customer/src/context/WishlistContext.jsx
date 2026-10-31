import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { addToWishlist, getMyWishlist, removeFromWishlist } from '../supabase/wishlist';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return undefined;

    if (!user) {
      setItems([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    getMyWishlist(user.id)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const api = useMemo(() => {
    const ids = items.map((product) => product.id);

    function has(id) {
      return ids.includes(String(id));
    }

    async function toggle(product) {
      if (authLoading) return { pending: true };
      if (!user) return { needsAuth: true };

      const id = String(product.id);
      if (has(id)) {
        await removeFromWishlist(user.id, id);
        setItems((current) => current.filter((item) => item.id !== id));
      } else {
        await addToWishlist(user.id, id);
        setItems((current) => [product, ...current.filter((item) => item.id !== id)]);
      }
      return { needsAuth: false };
    }

    return {
      items,
      ids,
      count: items.length,
      loading: authLoading || loading,
      has,
      toggle,
    };
  }, [items, user, authLoading, loading]);

  return <WishlistContext.Provider value={api}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const value = useContext(WishlistContext);
  if (!value) throw new Error('useWishlist must be used within WishlistProvider');
  return value;
}
