import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { getActiveProducts } from '../supabase/products';

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return undefined;

    let mounted = true;
    setLoading(true);

    getActiveProducts()
      .then((rows) => {
        if (!mounted) return;
        setProducts(rows);
        setError('');
      })
      .catch((err) => {
        if (!mounted) return;
        setProducts([]);
        setError(err.message || 'Could not load the collection.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [authLoading, user?.id]);

  const getById = useCallback(
    (id) => products.find((product) => product.id === String(id)) || null,
    [products],
  );

  const value = useMemo(
    () => ({ products, loading, error, getById }),
    [products, loading, error, getById],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used within CatalogProvider');
  return value;
}
