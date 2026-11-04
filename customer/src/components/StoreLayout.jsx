import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MenuIcon from '@mui/icons-material/Menu';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import Badge from '@mui/material/Badge';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import SiteSearch from './SiteSearch';
import { CATEGORIES } from '../data/catalog';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function StoreLayout() {
  const { count } = useCart();
  const wishlist = useWishlist();
  const location = useLocation();
  const [params] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const category = params.get('category') || '';

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="store">
      <p className="announce">Complimentary shipping on orders above ₹999</p>
      <header className="store-header">
        <div className="header-bar">
          <IconButton
            className="menu-btn"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon />
          </IconButton>
          <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
            <img className="brand-logo" src="/logo.png" alt="" />
            <span>
              <strong>Kumar Fancy Store</strong>
              <small>Jewellery</small>
            </span>
          </Link>
          <div className="search">
            <SiteSearch />
          </div>
          <div className="header-tools">
            <IconButton
              className="search-btn"
              aria-label="Search the store"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon />
            </IconButton>
            <IconButton
              component={Link}
              to="/wishlist"
              aria-label={`Wishlist, ${wishlist.count} saved`}
            >
              <Badge badgeContent={wishlist.count} color="primary">
                <FavoriteBorderIcon />
              </Badge>
            </IconButton>
            <IconButton component={Link} to="/account" aria-label="Account">
              <PersonOutlineOutlinedIcon />
            </IconButton>
            <IconButton component={Link} to="/cart" aria-label={`Bag, ${count} items`}>
              <Badge badgeContent={count} color="primary">
                <ShoppingBagOutlinedIcon />
              </Badge>
            </IconButton>
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

      <Drawer
        anchor="left"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        PaperProps={{ sx: { width: 300, p: 2 } }}
      >
        <Stack spacing={1.5} className="mobile-drawer-inner">
          <button
            type="button"
            className="drawer-search"
            onClick={() => {
              setMenuOpen(false);
              setSearchOpen(true);
            }}
          >
            <SearchIcon fontSize="small" />
            Search the store
          </button>
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
          <Link to="/orders" onClick={() => setMenuOpen(false)}>My orders</Link>
          <Link to="/wishlist" onClick={() => setMenuOpen(false)}>Wishlist</Link>
          <Link to="/cart" onClick={() => setMenuOpen(false)}>Bag</Link>
        </Stack>
      </Drawer>

      <Dialog
        fullScreen
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        aria-label="Search the store"
        slotProps={{ paper: { sx: { bgcolor: 'background.default', borderRadius: 0 } } }}
      >
        <div className="search-sheet">
          <SiteSearch inline autoFocus onNavigate={() => setSearchOpen(false)} />
          <IconButton aria-label="Close search" onClick={() => setSearchOpen(false)}>
            <CloseIcon />
          </IconButton>
        </div>
      </Dialog>

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
            <Link to="/orders">My orders</Link>
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
