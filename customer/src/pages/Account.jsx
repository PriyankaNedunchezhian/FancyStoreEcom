import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useAuth } from '../context/AuthContext';
import { passwordPolicyError } from '../utils/passwordPolicy';
import AppButton from '../mui/components/AppButton';
import AppTextField from '../mui/components/AppTextField';
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
    if (mode === 'register') {
      const policyError = passwordPolicyError(form.password);
      if (policyError) {
        setError(policyError);
        return;
      }
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
    const policyError = passwordPolicyError(passwords.next);
    if (policyError) {
      setError(policyError);
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
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
        <CircularProgress size={28} />
      </Box>
    );
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

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
          <AppButton variant="outlined" component={RouterLink} to="/orders">My orders</AppButton>
          <AppButton variant="outlined" component={RouterLink} to="/wishlist">Wishlist</AppButton>
          <AppButton onClick={onSignOut} loading={busy}>Sign out</AppButton>
        </Stack>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}

        <div className="account-panels">
          <section className="account-card">
            <h2>Profile</h2>
            <Box component="form" onSubmit={onSaveProfile} sx={{ display: 'grid', gap: 1.5 }}>
              <AppTextField
                label="Name"
                value={profile.name}
                onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                autoComplete="name"
              />
              <AppTextField
                label="Phone"
                value={profile.phone}
                onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                autoComplete="tel"
              />
              <AppTextField label="Email" value={user.email || ''} disabled />
              <AppButton type="submit" loading={busy}>Save profile</AppButton>
            </Box>
          </section>

          <section className="account-card">
            <h2>Password</h2>
            <Box component="form" onSubmit={onChangePassword} sx={{ display: 'grid', gap: 1.5 }}>
              <AppTextField
                label="Current password"
                type="password"
                value={passwords.current}
                onChange={(event) => setPasswords((current) => ({ ...current, current: event.target.value }))}
                autoComplete="current-password"
              />
              <AppTextField
                label="New password"
                type="password"
                value={passwords.next}
                onChange={(event) => setPasswords((current) => ({ ...current, next: event.target.value }))}
                autoComplete="new-password"
                helperText="At least 8 characters, with letters and numbers."
              />
              <AppTextField
                label="Confirm new password"
                type="password"
                value={passwords.confirm}
                onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))}
                autoComplete="new-password"
              />
              <AppButton type="submit" loading={busy}>Update password</AppButton>
            </Box>
          </section>

          <section className="account-card account-addresses">
            <div className="account-section-head">
              <h2>Saved addresses</h2>
              {canAdd && !editingId && (
                <AppButton variant="outlined" type="button" onClick={startNewAddress} disabled={busy}>
                  Add address
                </AppButton>
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
                    <Stack direction="row" spacing={1} className="address-actions" sx={{ flexWrap: 'wrap' }}>
                      {!row.isDefault && (
                        <AppButton size="small" variant="text" onClick={() => onMakeDefault(row.id)} disabled={busy}>
                          Use as default
                        </AppButton>
                      )}
                      <AppButton size="small" variant="text" onClick={() => startEditAddress(row)} disabled={busy}>
                        Edit
                      </AppButton>
                      <AppButton size="small" variant="text" color="error" onClick={() => onDeleteAddress(row.id)} disabled={busy}>
                        Delete
                      </AppButton>
                    </Stack>
                  </li>
                ))}
              </ul>
            )}

            {editingId && (
              <Box component="form" className="address-form" onSubmit={onSaveAddress} sx={{ display: 'grid', gap: 1.5 }}>
                <h3>{editingId === 'new' ? 'New address' : 'Edit address'}</h3>
                <AppTextField
                  label="Label"
                  value={addressForm.label}
                  onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Home"
                />
                <AppTextField
                  label="Recipient name"
                  value={addressForm.recipientName}
                  onChange={(event) => setAddressForm((current) => ({ ...current, recipientName: event.target.value }))}
                  autoComplete="name"
                />
                <AppTextField
                  label="Phone"
                  value={addressForm.phone}
                  onChange={(event) => setAddressForm((current) => ({ ...current, phone: event.target.value }))}
                  autoComplete="tel"
                />
                <AppTextField
                  label="Address"
                  multiline
                  minRows={3}
                  value={addressForm.address}
                  onChange={(event) => setAddressForm((current) => ({ ...current, address: event.target.value }))}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={addressForm.isDefault}
                      onChange={(event) => setAddressForm((current) => ({ ...current, isDefault: event.target.checked }))}
                    />
                  }
                  label="Use as default"
                />
                <Stack direction="row" spacing={1}>
                  <AppButton type="submit" loading={busy}>Save address</AppButton>
                  <AppButton variant="outlined" type="button" onClick={cancelAddressForm} disabled={busy}>
                    Cancel
                  </AppButton>
                </Stack>
              </Box>
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
        <Tabs
          value={mode}
          onChange={(_event, next) => { setMode(next); setError(''); setNotice(''); }}
          sx={{ mb: 2 }}
        >
          <Tab value="sign-in" label="Sign in" />
          <Tab value="register" label="Create account" />
        </Tabs>
        <Box component="form" onSubmit={onSubmit} sx={{ display: 'grid', gap: 1.5 }}>
          {mode === 'register' && (
            <AppTextField label="Name" value={form.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" />
          )}
          <AppTextField type="email" label="Email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" />
          <AppTextField
            type="password"
            label="Password"
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            helperText={mode === 'register' ? 'At least 8 characters, with letters and numbers.' : undefined}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
          {notice ? <Alert severity="success">{notice}</Alert> : null}
          <AppButton type="submit" loading={busy} fullWidth>
            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </AppButton>
        </Box>
        <p className="account-foot">
          Create a customer account to save a wishlist, addresses, and track My Orders. Admin staff use the separate admin app with an admin role.
        </p>
      </div>
    </div>
  );
}
