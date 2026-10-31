import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';

export default function Wishlist() {
  const { user, loading: authLoading } = useAuth();
  const { items, loading } = useWishlist();

  if (authLoading || loading) {
    return <p className="status-line">Loading your wishlist…</p>;
  }

  if (!user) {
    return (
      <div className="empty">
        <h1>Sign in to see your wishlist</h1>
        <p>Saved pieces are stored on your account and show up in admin.</p>
        <Link className="btn btn-dark" to="/account">Sign in</Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty">
        <h1>Nothing saved yet</h1>
        <p>Tap the heart on a piece to keep it here.</p>
        <Link className="btn btn-dark" to="/shop">Browse the collection</Link>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <header className="page-intro">
        <p className="kicker">Saved</p>
        <h1>Wishlist</h1>
        <p>{items.length} {items.length === 1 ? 'piece' : 'pieces'}</p>
      </header>
      <div className="product-grid">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
