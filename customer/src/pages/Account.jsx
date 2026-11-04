import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MAX_ADDRESSES,
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from '../supabase/addresses';

const EMPTY_AUTH = { name: '', email: '', password: '' };
const EMPTY_ADDRESS = {
  label: 'Home',
  recipientName: '',
  phone: '',
  address: '',
  isDefault: false,
};

function accountErrorMessage(err, mode) {
  const code = err?.code || '';
  const message = String(err?.message || '').toLowerCase();
  if (code === 'user_already_exists' || message.includes('already registered') || message.includes('already been registered')) {
    return 'This email is already registered. Use Sign in with that email and password.';
  }
  if (code === 'over_email_send_rate_limit' || message.includes('rate limit')) {
    return 'A new account needs a confirmation email, and Supabase has paused those. Sign in with an existing account instead.';
  }
  return err?.message || (mode === 'sign-in' ? 'Could not sign in.' : 'Could not create the account.');
}

export default function Account() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, signOut, updateProfile, updatePassword } = useAuth();
  const [mode, setMode] = useState('sign-in');
  const [form, setForm] = useState(EMPTY_AUTH);
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(false);

  const refreshAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      return;
    }
    setAddressesLoading(true);
    try {
      const rows = await listAddresses();
      setAddresses(rows);
    } catch (err) {
      setError(err.message || 'Could not load addresses.');
    } finally {
      setAddressesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.user_metadata?.full_name || '',
      phone: user.user_metadata?.phone || '',
    });
    refreshAddresses();
  }, [user, refreshAddresses]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setNotice('');
    setError('');
    if (!form.email.trim() || !form.password.trim() || (mode === 'register' && !form.name.trim())) {
      setError('Fill in every field.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        await signIn(form.email, form.password);
        navigate('/shop');
      } else {
        const result = await signUp(form.name, form.email, form.password);
        if (result.session) {
          navigate('/shop');
        } else {
          setNotice('Account created. Confirm the email if asked, then sign in with the same password.');
          setMode('sign-in');
        }
      }
    } catch (err) {
      setError(accountErrorMessage(err, mode));
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    setBusy(true);
    setError('');
    try {
      await signOut();
    } catch (err) {
      setError(err.message || 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveProfile(event) {
    event.preventDefault();
    setNotice('');
    setError('');
    if (!profile.name.trim()) {
      setError('Name is required.');
      return;
    }
    setBusy(true);
    try {
      await updateProfile({ name: profile.name, phone: profile.phone });
      setNotice('Profile saved.');
    } catch (err) {
      setError(err.message || 'Could not save profile.');
    } finally {
      setBusy(false);
    }
  }

  async function onChangePassword(event) {
    event.preventDefault();
    setNotice('');
    setError('');
    if (!passwords.current || !passwords.next) {
      setError('Enter your current and new password.');
      return;
    }
    if (passwords.next.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      setNotice('Password updated.');
    } catch (err) {
      setError(err.message || 'Could not update password.');
    } finally {
      setBusy(false);
    }
  }

  function startEditAddress(row) {
    setEditingId(row.id);
    setAddressForm({
      label: row.label,
      recipientName: row.recipientName,
      phone: row.phone,
      address: row.address,
      isDefault: row.isDefault,
    });
    setError('');
    setNotice('');
  }

  function startNewAddress() {
    setEditingId('new');
    setAddressForm({
      ...EMPTY_ADDRESS,
      recipientName: profile.name || user?.user_metadata?.full_name || '',
      phone: profile.phone || user?.user_metadata?.phone || '',
    });
    setError('');
    setNotice('');
  }

  function cancelAddressForm() {
    setEditingId(null);
    setAddressForm(EMPTY_ADDRESS);
  }

  async function onSaveAddress(event) {
    event.preventDefault();
    setNotice('');
    setError('');
    if (!addressForm.recipientName.trim() || !addressForm.phone.trim() || !addressForm.address.trim()) {
      setError('Name, phone, and address are required.');
      return;
    }
    setBusy(true);
    try {
      if (editingId === 'new') {
        await createAddress(addressForm);
        setNotice('Address saved.');
      } else {
        await updateAddress(editingId, addressForm);
        setNotice('Address updated.');
      }
      cancelAddressForm();
      await refreshAddresses();
    } catch (err) {
      setError(err.message || 'Could not save address.');
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteAddress(id) {
    setNotice('');
    setError('');
    setBusy(true);
    try {
      await deleteAddress(id);
      if (editingId === id) cancelAddressForm();
      setNotice('Address removed.');
      await refreshAddresses();
    } catch (err) {
      setError(err.message || 'Could not delete address.');
    } finally {
      setBusy(false);
    }
  }

  async function onMakeDefault(id) {
    setNotice('');
    setError('');
    setBusy(true);
    try {
      await setDefaultAddress(id);
      setNotice('Default address updated.');
      await refreshAddresses();
    } catch (err) {
      setError(err.message || 'Could not set default address.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="status-line">Loading account…</p>;
  }

  if (user) {
    const canAdd = addresses.length < MAX_ADDRESSES;
    return (
      <div className="account account-signed">
        <header className="page-intro">
          <p className="kicker">Account</p>
          <h1>{profile.name || 'Your account'}</h1>
          <p>{user.email}</p>
        </header>

        <div className="hero-actions account-links">
          <Link className="btn btn-line" to="/orders">My orders</Link>
          <Link className="btn btn-line" to="/wishlist">Wishlist</Link>
          <button className="btn btn-dark" type="button" onClick={onSignOut} disabled={busy}>
            Sign out
          </button>
        </div>

        {error && <p className="form-notice">{error}</p>}
        {notice && <p className="form-notice">{notice}</p>}

        <div className="account-panels">
          <section className="account-card">
            <h2>Profile</h2>
            <form onSubmit={onSaveProfile}>
              <label>
                Name
                <input
                  value={profile.name}
                  onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                  autoComplete="name"
                />
              </label>
              <label>
                Phone
                <input
                  value={profile.phone}
                  onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                  autoComplete="tel"
                />
              </label>
              <label>
                Email
                <input value={user.email || ''} disabled readOnly />
              </label>
              <button className="btn btn-dark" type="submit" disabled={busy}>
                Save profile
              </button>
            </form>
          </section>

          <section className="account-card">
            <h2>Password</h2>
            <form onSubmit={onChangePassword}>
              <label>
                Current password
                <input
                  type="password"
                  value={passwords.current}
                  onChange={(event) => setPasswords((current) => ({ ...current, current: event.target.value }))}
                  autoComplete="current-password"
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  value={passwords.next}
                  onChange={(event) => setPasswords((current) => ({ ...current, next: event.target.value }))}
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))}
                  autoComplete="new-password"
                />
              </label>
              <button className="btn btn-dark" type="submit" disabled={busy}>
                Update password
              </button>
            </form>
          </section>

          <section className="account-card account-addresses">
            <div className="account-section-head">
              <h2>Saved addresses</h2>
              {canAdd && !editingId && (
                <button className="btn btn-line" type="button" onClick={startNewAddress} disabled={busy}>
                  Add address
                </button>
              )}
            </div>
            <p className="account-foot">
              Up to {MAX_ADDRESSES} addresses. Default is used at checkout.
            </p>

            {addressesLoading ? (
              <p className="status-line">Loading addresses…</p>
            ) : addresses.length === 0 && !editingId ? (
              <p className="account-foot">No saved addresses yet.</p>
            ) : (
              <ul className="address-list">
                {addresses.map((row) => (
                  <li key={row.id} className={row.isDefault ? 'on' : ''}>
                    <div>
                      <p className="address-label">
                        {row.label}
                        {row.isDefault ? ' · Default' : ''}
                      </p>
                      <p>
                        {row.recipientName} · {row.phone}
                      </p>
                      <p>{row.address}</p>
                    </div>
                    <div className="address-actions">
                      {!row.isDefault && (
                        <button type="button" className="text-btn" onClick={() => onMakeDefault(row.id)} disabled={busy}>
                          Use as default
                        </button>
                      )}
                      <button type="button" className="text-btn" onClick={() => startEditAddress(row)} disabled={busy}>
                        Edit
                      </button>
                      <button type="button" className="text-btn" onClick={() => onDeleteAddress(row.id)} disabled={busy}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {editingId && (
              <form className="address-form" onSubmit={onSaveAddress}>
                <h3>{editingId === 'new' ? 'New address' : 'Edit address'}</h3>
                <label>
                  Label
                  <input
                    value={addressForm.label}
                    onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))}
                    placeholder="Home"
                  />
                </label>
                <label>
                  Recipient name
                  <input
                    value={addressForm.recipientName}
                    onChange={(event) => setAddressForm((current) => ({ ...current, recipientName: event.target.value }))}
                    autoComplete="name"
                  />
                </label>
                <label>
                  Phone
                  <input
                    value={addressForm.phone}
                    onChange={(event) => setAddressForm((current) => ({ ...current, phone: event.target.value }))}
                    autoComplete="tel"
                  />
                </label>
                <label>
                  Address
                  <textarea
                    rows={3}
                    value={addressForm.address}
                    onChange={(event) => setAddressForm((current) => ({ ...current, address: event.target.value }))}
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(event) => setAddressForm((current) => ({ ...current, isDefault: event.target.checked }))}
                  />
                  <span>Use as default</span>
                </label>
                <div className="hero-actions">
                  <button className="btn btn-dark" type="submit" disabled={busy}>
                    Save address
                  </button>
                  <button className="btn btn-line" type="button" onClick={cancelAddressForm} disabled={busy}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="account">
      <div className="account-card">
        <p className="kicker">Account</p>
        <h1>{mode === 'sign-in' ? 'Sign in' : 'Create account'}</h1>
        <div className="mode-switch" role="tablist">
          <button type="button" className={mode === 'sign-in' ? 'on' : ''} onClick={() => { setMode('sign-in'); setError(''); setNotice(''); }}>
            Sign in
          </button>
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setError(''); setNotice(''); }}>
            Create account
          </button>
        </div>
        <form onSubmit={onSubmit}>
          {mode === 'register' && (
            <label>
              Name
              <input value={form.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" />
            </label>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} />
          </label>
          {error && <p className="form-notice">{error}</p>}
          {notice && <p className="form-notice">{notice}</p>}
          <button className="btn btn-dark btn-block" type="submit" disabled={busy}>
            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="account-foot">
          Create a customer account to save a wishlist, addresses, and track My Orders. Admin staff use the separate admin app with an admin role.
        </p>
      </div>
    </div>
  );
}
