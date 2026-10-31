import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { CATEGORIES } from '../data/catalog';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function StoreLayout() {
  const { count } = useCart();
  const wishlist = useWishlist();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [term, setTerm] = useState(params.get('q') || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const category = params.get('category') || '';

  useEffect(() => {
    setTerm(params.get('q') || '');
  }, [params]);

  useEffect(() => {
    setMenuOpen(false);
  }, [params]);

  function onSearch(event) {
    event.preventDefault();
    const query = term.trim();
    const next = new URLSearchParams();
    if (category) next.set('category', category);
    if (query) next.set('q', query);
    const search = next.toString();
    navigate(search ? `/shop?${search}` : '/shop');
    setMenuOpen(false);
  }

  return (
    <div className="store">
      <p className="announce">Complimentary shipping on orders above ₹999</p>
      <header className="store-header">
        <div className="header-bar">
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
            <img className="brand-logo" src="/logo.png" alt="" />
            <span>
              <strong>Kumar Fancy Store</strong>
              <small>Jewellery</small>
            </span>
          </Link>
          <form className="search" onSubmit={onSearch}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search earrings, chains, rings…"
              aria-label="Search the collection"
            />
          </form>
          <div className="header-tools">
            <Link className="icon-btn" to="/wishlist" aria-label={`Wishlist, ${wishlist.count} saved`}>
              <Heart size={18} />
              {wishlist.count > 0 && <span className="badge">{wishlist.count}</span>}
            </Link>
            <Link className="icon-btn" to="/account" aria-label="Account">
              <User size={18} />
            </Link>
            <Link className="icon-btn" to="/cart" aria-label={`Bag, ${count} items`}>
              <ShoppingBag size={18} />
              {count > 0 && <span className="badge">{count}</span>}
            </Link>
          </div>
        </div>
        <nav className="primary-nav" aria-label="Categories">
          <NavLink
            to="/shop"
            end
            className={({ isActive }) => (isActive && !category ? 'active' : '')}
          >
            Shop
          </NavLink>
          {CATEGORIES.map((item) => (
            <Link
              key={item.name}
              to={`/shop?category=${encodeURIComponent(item.name)}`}
              className={category === item.name ? 'active' : ''}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </header>

      {menuOpen && (
        <div className="mobile-drawer">
          <form className="search mobile-search" onSubmit={onSearch}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search the collection"
              aria-label="Search the collection"
            />
          </form>
          <Link to="/shop" onClick={() => setMenuOpen(false)}>Shop all</Link>
          {CATEGORIES.map((item) => (
            <Link
              key={item.name}
              to={`/shop?category=${encodeURIComponent(item.name)}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          <Link to="/account" onClick={() => setMenuOpen(false)}>Account</Link>
          <Link to="/wishlist" onClick={() => setMenuOpen(false)}>Wishlist</Link>
          <Link to="/cart" onClick={() => setMenuOpen(false)}>Bag</Link>
        </div>
      )}

      <main className="store-main">
        <Outlet />
      </main>

      <footer className="store-footer">
        <div className="footer-grid">
          <div>
            <img className="footer-logo" src="/logo.png" alt="" />
            <p className="brand-name">Kumar Fancy Store</p>
            <p className="footer-note">
              Earrings, necklaces, bangles, rings, bracelets, and chains for everyday wear.
            </p>
          </div>
          <div>
            <p className="footer-label">Shop</p>
            <Link to="/shop">All jewellery</Link>
            {CATEGORIES.map((item) => (
              <Link key={item.name} to={`/shop?category=${encodeURIComponent(item.name)}`}>
                {item.name}
              </Link>
            ))}
          </div>
          <div>
            <p className="footer-label">Your store</p>
            <Link to="/account">Account</Link>
            <Link to="/wishlist">Wishlist</Link>
            <Link to="/cart">Bag</Link>
            <Link to="/checkout">Checkout</Link>
          </div>
        </div>
        <p className="footer-meta">© {new Date().getFullYear()} Kumar Fancy Store</p>
      </footer>
    </div>
  );
}
