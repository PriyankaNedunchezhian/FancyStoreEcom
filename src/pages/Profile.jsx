import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../supabase/auth';
import ConfirmDialog from '../components/ConfirmDialog';
import ThemeSwitcher from '../components/ThemeSwitcher';
import './Profile.css';

function getPasswordErrorMessage(err) {
  const message = (err?.message || '').toLowerCase();
  const code = (err?.code || '').toLowerCase();

  if (
    code.includes('invalid') ||
    message.includes('invalid login') ||
    message.includes('invalid credentials')
  ) {
    return 'Current password is incorrect.';
  }
  if (message.includes('at least') || message.includes('weak')) {
    return 'New password should be at least 6 characters.';
  }
  if (message.includes('rate') || message.includes('too many')) {
    return 'Too many attempts. Try again later.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Check your connection.';
  }
  return 'Could not update password. Please try again.';
}

export default function Profile() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  async function handleLogoutConfirm() {
    setLogoutOpen(false);
    await logout();
  }

  const initials = (user?.email?.[0] || 'A').toUpperCase();
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : '—';
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString()
    : '—';

  async function handlePasswordUpdate(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password should be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(getPasswordErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="profile-page">
      <section className="profile-card">
        <div className="profile-card-head">
          <span className="profile-page-avatar">{initials}</span>
          <div>
            <h2>Admin details</h2>
            <p>Account information for this admin user.</p>
          </div>
        </div>

        <dl className="profile-meta">
          <div>
            <dt>Email</dt>
            <dd>{user?.email || '—'}</dd>
          </div>
          <div>
            <dt>User ID</dt>
            <dd className="mono">{user?.id || '—'}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{createdAt}</dd>
          </div>
          <div>
            <dt>Last sign in</dt>
            <dd>{lastSignIn}</dd>
          </div>
        </dl>

        <button
          type="button"
          className="profile-signout"
          onClick={() => setLogoutOpen(true)}
        >
          Sign out
        </button>
      </section>

      <section className="profile-card">
        <ThemeSwitcher variant="panel" />
      </section>

      <section className="profile-card">
        <div className="profile-card-head">
          <div>
            <h2>Update password</h2>
            <p>Choose a new password for your admin account.</p>
          </div>
        </div>

        <form className="profile-password-form" onSubmit={handlePasswordUpdate}>
          <label htmlFor="current-password">
            Current password
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <label htmlFor="new-password">
            New password
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </label>

          <label htmlFor="confirm-password">
            Confirm new password
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </label>

          {error ? <p className="profile-alert error" role="alert">{error}</p> : null}
          {success ? (
            <p className="profile-alert success" role="status">
              {success}
            </p>
          ) : null}

          <button type="submit" className="profile-submit" disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>

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
