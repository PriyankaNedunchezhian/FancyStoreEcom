import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';
import './AdminLayout.css';

const navItems = [
  {
    to: '/dashboard',
    label: 'Home',
    title: 'Overview',
    subtitle: "Your store's performance at a glance.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
      </svg>
    ),
  },
  {
    to: '/products',
    label: 'Product',
    title: 'Product',
    subtitle: 'Manage your catalog and inventory.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 3 7v10l9 5 9-5V7l-9-5zm0 2.2 6.5 3.6v1.9L12 13.3 5.5 9.7V7.8L12 4.2zM5 11.2l6.5 3.6V21L5 17.4v-6.2zm8.5 9.8v-6.2L20 11.2v6.2L13.5 21z" />
      </svg>
    ),
  },
  {
    to: '/orders',
    label: 'Order',
    title: 'Order',
    subtitle: 'Track and update customer orders.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h14v2H7V4zm0 7h14v2H7v-2zm0 7h14v2H7v-2zM3 4h2v2H3V4zm0 7h2v2H3v-2zm0 7h2v2H3v-2z" />
      </svg>
    ),
  },
];

const pageMeta = {
  '/profile': {
    title: 'Profile',
    subtitle: 'View admin details and update your password.',
  },
};

function getActivePage(pathname) {
  if (pathname.startsWith('/profile')) {
    return pageMeta['/profile'];
  }

  return (
    navItems.find((item) => pathname.startsWith(item.to)) || navItems[0]
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [search, setSearch] = useState('');
  const activePage = getActivePage(location.pathname);

  async function handleLogoutConfirm() {
    setLogoutOpen(false);
    await logout();
  }

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const initials = (user?.email?.[0] || 'A').toUpperCase();

  const searchField = (
    <label className="navbar-search">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10.5 3a7.5 7.5 0 015.95 12.07l3.74 3.74-1.41 1.41-3.74-3.74A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" />
      </svg>
      <input
        type="search"
        placeholder="Search orders, customers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </label>
  );

  return (
    <div className={`admin-shell${sidebarOpen ? ' sidebar-open' : ''}`}>
      <aside className="admin-sidebar" aria-label="Main navigation">
        <div className="sidebar-brand-row">
          <img
            src="/fancy-store-mark-dark.svg"
            alt="Fancy Store"
            width="34"
            height="34"
            className="sidebar-logo"
          />
          <div className="sidebar-brand-text">
            <p className="sidebar-brand-name">Fancy Store</p>
            <p className="sidebar-brand-sub">Admin</p>
          </div>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              {item.icon}
              <span className="sidebar-link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="sidebar-logout"
          title="Logout"
          aria-label="Logout"
          onClick={() => setLogoutOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 3H5a2 2 0 00-2 2v14a2 2 0 002 2h5v-2H5V5h5V3zm10.6 9-4.3-4.3 1.4-1.4L23.4 12l-5.7 5.7-1.4-1.4L20.6 13H9v-2h11.6z" />
          </svg>
          <span className="sidebar-link-label">Logout</span>
        </button>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="admin-main">
        <header className="admin-navbar">
          <div className="navbar-left">
            <button
              type="button"
              className="menu-toggle"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <span className="crumb-root">Admin</span>
              <span className="crumb-sep">›</span>
              <span className="crumb-current">{activePage.title}</span>
            </nav>
          </div>

          <div className="navbar-right">
            <div className="navbar-search-desktop">{searchField}</div>

            <button type="button" className="icon-btn help-btn" aria-label="Help">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 15.2a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zm1.4-4.55c-.62.35-.9.58-.9 1.15h-1.8c0-1.28.74-1.9 1.45-2.3.62-.35.95-.58.95-1.15 0-.62-.5-1.05-1.2-1.05-.78 0-1.25.45-1.4 1.15l-1.75-.35C8.55 8.5 9.8 7.2 11.9 7.2c1.9 0 3.2 1.1 3.2 2.7 0 1.1-.6 1.75-1.7 2.35z" />
              </svg>
            </button>

            <Link
              to="/profile"
              className="profile-btn"
              aria-label="Open profile"
              title="Profile"
            >
              <span className="profile-avatar">{initials}</span>
            </Link>
          </div>
        </header>

        <div className="navbar-search-mobile">{searchField}</div>

        <main className="admin-content">
          <div className="page-header">
            <h1>{activePage.title}</h1>
            <p>{activePage.subtitle}</p>
          </div>
          <Outlet />
        </main>

        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `mobile-nav-link${isActive ? ' active' : ''}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
          <Link
            to="/profile"
            className={`mobile-nav-link${location.pathname.startsWith('/profile') ? ' active' : ''}`}
          >
            <span className="mobile-nav-avatar">{initials}</span>
            <span>Profile</span>
          </Link>
        </nav>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title="Logout?"
        message="Do you want to logout from Fancy Store admin?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        danger
        onConfirm={handleLogoutConfirm}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}
