import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

function allowedOrigins() {
  const extra = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extra]);
}

export function originAllowed(req: Request) {
  const origin = req.headers.get('Origin');
  if (!origin) return true;
  return allowedOrigins().has(origin);
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowed = allowedOrigins();
  return {
    'Access-Control-Allow-Origin': allowed.has(origin) ? origin : 'http://localhost:5174',
    Vary: 'Origin',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(req),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export function errorResponse(req: Request, message: string, status = 400) {
  return jsonResponse(req, { error: message }, status);
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isAdminUser(user: User | null | undefined) {
  return user?.app_metadata?.role === 'admin';
}

export function canAccessOrder(
  user: User,
  order: { customer_id?: string | null },
) {
  if (isAdminUser(user)) return true;
  return Boolean(order.customer_id) && order.customer_id === user.id;
}

export async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return { user: null as User | null, error: 'Sign in required.', status: 401 };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!supabaseUrl || !anonKey) {
    return { user: null as User | null, error: 'Auth is not configured.', status: 500 };
  }

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    return { user: null as User | null, error: 'Sign in required.', status: 401 };
  }
  return { user, error: '', status: 200 };
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function paymentMatchesOrder(payment: {
  status?: string;
  amount?: number;
  currency?: string;
  order_id?: string;
}, order: { total?: number; razorpay_order_id?: string | null }) {
  const amountPaise = Math.round(Number(order.total || 0) * 100);
  const captured = payment.status === 'captured';
  const amountOk = Number(payment.amount) === amountPaise;
  const currencyOk = String(payment.currency || '').toUpperCase() === 'INR';
  const orderOk =
    Boolean(order.razorpay_order_id) &&
    payment.order_id === order.razorpay_order_id;
  return captured && amountOk && currencyOk && orderOk;
}
