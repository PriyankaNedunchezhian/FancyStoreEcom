const ADMIN_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
].join('; ');

const ADMIN_CSP_DEV = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data: blob: https:",
  "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https://*.supabase.co wss://*.supabase.co",
].join('; ');

const COMMON = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

export const SECURITY_HEADERS = {
  ...COMMON,
  'Content-Security-Policy': ADMIN_CSP,
};

export const DEV_SECURITY_HEADERS = {
  ...COMMON,
  'Content-Security-Policy': ADMIN_CSP_DEV,
};
