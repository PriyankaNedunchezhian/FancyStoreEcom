import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { login, resetPassword } from '../supabase/auth';
import { useAuth } from '../context/AuthContext';
import ThemeSwitcher from '../components/ThemeSwitcher';
import AppButton from '../mui/components/AppButton';
import AppTextField from '../mui/components/AppTextField';
import './Login.css';

function getAuthErrorMessage(err, mode) {
  const message = (err?.message || '').toLowerCase();
  const code = (err?.code || '').toLowerCase();

  if (code === 'not_admin' || message.includes('admin access only')) {
    return 'Admin access only. Use an admin account, or shop on the customer storefront.';
  }
  if (
    code.includes('invalid') ||
    message.includes('invalid login') ||
    message.includes('invalid credentials')
  ) {
    return mode === 'reset'
      ? 'If an account exists for that email, a reset link will be sent.'
      : 'Invalid email or password.';
  }
  if (message.includes('email') && message.includes('valid')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('rate') || message.includes('too many')) {
    return 'Too many attempts. Try again later.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Check your connection.';
  }
  return mode === 'reset'
    ? 'If an account exists for that email, a reset link will be sent.'
    : 'Login failed. Please try again.';
}

export default function Login() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    location.state?.adminOnly
      ? 'Admin access only. Sign in with an admin account.'
      : '',
  );
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <Box className="auth-loading">
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (user && isAdmin) {
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
      setError(getAuthErrorMessage(err, 'login'));
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
      setSuccess('If an account exists for that email, a reset link will be sent.');
    } catch (err) {
      const message = getAuthErrorMessage(err, 'reset');
      if (message.toLowerCase().includes('too many') || message.toLowerCase().includes('network')) {
        setError(message);
      } else {
        setSuccess('If an account exists for that email, a reset link will be sent.');
      }
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
            src="/fancy-store-mark-dark.svg"
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
        <div className="login-theme-bar">
          <ThemeSwitcher />
        </div>
        <div className="login-panel" key={mode}>
          <Typography variant="overline" color="text.secondary">
            {isReset ? 'Account recovery' : 'Welcome back'}
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
            {isReset ? 'Reset password' : 'Sign in'}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            {isReset
              ? 'Enter your admin email and we will send a reset link.'
              : 'Access products, orders, and store operations.'}
          </Typography>

          <Box
            component="form"
            onSubmit={isReset ? handleReset : handleLogin}
            sx={{ display: 'grid', gap: 1.5 }}
          >
            <AppTextField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            {!isReset ? (
              <Stack spacing={0.5}>
                <AppTextField
                  id="password"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Link
                    component="button"
                    type="button"
                    underline="hover"
                    onClick={() => switchMode('reset')}
                  >
                    Forgot password?
                  </Link>
                </Box>
              </Stack>
            ) : null}

            {error ? <Alert severity="error">{error}</Alert> : null}
            {success ? <Alert severity="success">{success}</Alert> : null}

            <AppButton type="submit" loading={loading} fullWidth>
              {loading
                ? isReset
                  ? 'Sending…'
                  : 'Signing in…'
                : isReset
                  ? 'Send reset link'
                  : 'Sign in'}
            </AppButton>
          </Box>

          {isReset ? (
            <Link
              component="button"
              type="button"
              underline="hover"
              onClick={() => switchMode('login')}
              sx={{ mt: 2 }}
            >
              ← Back to sign in
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
