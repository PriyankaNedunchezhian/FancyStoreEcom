import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EMPTY = { name: '', email: '', password: '' };

function accountErrorMessage(err, mode) {
  const code = err?.code || '';
  const message = String(err?.message || '').toLowerCase();
  if (code === 'user_already_exists' || message.includes('already registered') || message.includes('already been registered')) {
    return 'This email is already on the admin account. Use Sign in with that same email and password.';
  }
  if (code === 'over_email_send_rate_limit' || message.includes('rate limit')) {
    return 'A new account needs a confirmation email, and Supabase has paused those. Sign in with the same email and password you use on the admin page.';
  }
  return err?.message || (mode === 'sign-in' ? 'Could not sign in.' : 'Could not create the account.');
}

export default function Account() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState('sign-in');
  const [form, setForm] = useState(EMPTY);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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

  if (loading) {
    return <p className="status-line">Loading account…</p>;
  }

  if (user) {
    const name = user.user_metadata?.full_name;
    return (
      <div className="account">
        <div className="account-card">
          <p className="kicker">Account</p>
          <h1>{name || 'Signed in'}</h1>
          <p className="lede">{user.email}</p>
          {error && <p className="form-notice">{error}</p>}
          <div className="hero-actions">
            <Link className="btn btn-line" to="/wishlist">Wishlist</Link>
            <button className="btn btn-dark" type="button" onClick={onSignOut} disabled={busy}>
              Sign out
            </button>
          </div>
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
          Sign in with the same email and password as the admin page. That uses the same account, so the store can read the catalog and save wishlists.
        </p>
      </div>
    </div>
  );
}
