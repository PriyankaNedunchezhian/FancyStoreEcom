import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'fancy-customer-cart';

function readCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && item.id && item.qty > 0);
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const api = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    function addItem(product, qty = 1) {
      const amount = Math.max(1, Number(qty) || 1);
      setItems((current) => {
        const existing = current.find((item) => item.id === product.id);
        if (existing) {
          return current.map((item) =>
            item.id === product.id ? { ...item, qty: item.qty + amount } : item,
          );
        }
        return [
          ...current,
          {
            id: product.id,
            name: product.name,
            category: product.category,
            price: product.sellingPrice,
            mrp: product.mrp,
            imageUrl: product.imageUrl || '',
            qty: amount,
          },
        ];
      });
    }

    function setQty(id, qty) {
      const amount = Number(qty);
      if (!Number.isFinite(amount) || amount < 1) {
        setItems((current) => current.filter((item) => item.id !== id));
        return;
      }
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, qty: amount } : item)),
      );
    }

    function removeItem(id) {
      setItems((current) => current.filter((item) => item.id !== id));
    }

    function clear() {
      setItems([]);
    }

    return { items, count, subtotal, addItem, setQty, removeItem, clear };
  }, [items]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within CartProvider');
  return value;
}
