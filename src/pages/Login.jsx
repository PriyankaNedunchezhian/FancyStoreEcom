import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login, resetPassword } from '../firebase/auth';
import { useAuth } from '../context/AuthContext';
import './Login.css';

function getAuthErrorMessage(code, mode) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return mode === 'reset'
        ? 'No account found with this email.'
        : 'Invalid email or password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    case 'auth/missing-email':
      return 'Please enter your email address.';
    default:
      return mode === 'reset'
        ? 'Could not send reset email. Please try again.'
        : 'Login failed. Please try again.';
  }
}

export default function Login() {
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="auth-loading">
        <p>Loading…</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    setSuccess('');
    setPassword('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err.code, 'login'));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSuccess('Password reset email sent. Check your inbox.');
    } catch (err) {
      setError(getAuthErrorMessage(err.code, 'reset'));
    } finally {
      setLoading(false);
    }
  }

  const isReset = mode === 'reset';

  return (
    <div className="login-page">
      <section className="login-brand-side" aria-label="Fancy Store">
        <div className="login-brand-top">
          <img
            className="login-logo"
            src="/fancy-store-mark.svg"
            alt="Fancy Store logo"
            width="56"
            height="56"
          />
          <p className="login-brand">Fancy Store</p>
          <p className="login-brand-tagline">Admin console</p>
        </div>
        <p className="login-copyright">© {new Date().getFullYear()} Fancy Store</p>
        <div className="login-brand-grid" aria-hidden="true" />
      </section>

      <section className="login-form-side">
        <div className="login-panel" key={mode}>
          <p className="login-kicker">{isReset ? 'Account recovery' : 'Welcome back'}</p>
          <h1>{isReset ? 'Reset password' : 'Sign in'}</h1>
          <p className="login-subtitle">
            {isReset
              ? 'Enter your admin email and we will send a reset link.'
              : 'Access products, orders, and store operations.'}
          </p>

          <form
            className="login-form"
            onSubmit={isReset ? handleReset : handleLogin}
          >
            <label htmlFor="email">
              Email
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@fancystore.com"
              />
            </label>

            {!isReset ? (
              <div className="password-field">
                <div className="password-label-row">
                  <label htmlFor="password">Password</label>
                  <button
                    type="button"
                    className="forgot-link"
                    onClick={() => switchMode('reset')}
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>
            ) : null}

            {error ? <p className="login-error" role="alert">{error}</p> : null}
            {success ? <p className="login-success" role="status">{success}</p> : null}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading
                ? isReset
                  ? 'Sending…'
                  : 'Signing in…'
                : isReset
                  ? 'Send reset link'
                  : 'Sign in'}
            </button>
          </form>

          {isReset ? (
            <button
              type="button"
              className="back-to-login"
              onClick={() => switchMode('login')}
            >
              ← Back to sign in
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
