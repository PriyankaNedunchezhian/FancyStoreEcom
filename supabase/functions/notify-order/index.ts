import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  canAccessOrder,
  corsHeadersFor,
  errorResponse,
  escapeHtml,
  isAdminUser,
  jsonResponse,
  originAllowed,
  requireUser,
} from '../_shared/security.ts';

const EVENTS = new Set(['placed', 'confirmed', 'shipped', 'cancelled']);

function formatInr(amount: number) {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount}`;
  }
}

function toE164(phone: string, defaultCountry = '91') {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    const rest = digits.slice(1).replace(/\D/g, '');
    return rest ? `+${rest}` : '';
  }
  digits = digits.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  if (digits.length === 10) return `+${defaultCountry}${digits}`;
  if (digits.length === 12 && digits.startsWith(defaultCountry)) {
    return `+${digits}`;
  }
  if (digits.length > 10) return `+${digits}`;
  return '';
}

function eventCopy(event: string, order: Record<string, unknown>) {
  const id = escapeHtml(order.order_id);
  const total = formatInr(Number(order.total || 0));
  const name = escapeHtml(order.customer_name || 'there');
  const payment = escapeHtml(order.payment_status || '');
  const method = escapeHtml(order.payment_method || '');

  const headlines: Record<string, string> = {
    placed: `Order #${id} received`,
    confirmed: `Order #${id} confirmed`,
    shipped: `Order #${id} shipped`,
    cancelled: `Order #${id} cancelled`,
  };

  const lines: Record<string, string> = {
    placed: `Hi ${name}, we received your Kumar Fancy Store order #${id} for ${total} (${method}, ${payment}).`,
    confirmed: `Hi ${name}, your order #${id} is confirmed and we are preparing it (${total}).`,
    shipped: `Hi ${name}, your order #${id} is on the way (${total}).`,
    cancelled: `Hi ${name}, your order #${id} has been cancelled (${total}).`,
  };

  return {
    subject: headlines[event] || `Order #${id} update`,
    text: lines[event] || `Update for order #${id}.`,
    headline: headlines[event] || `Order #${id}`,
  };
}

function buildEmailHtml(
  copy: { subject: string; text: string; headline: string },
  order: Record<string, unknown>,
  items: Array<Record<string, unknown>>,
) {
  const rows = (items || [])
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${escapeHtml(item.product_name)} × ${Number(item.quantity || 0)}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${formatInr(Number(item.line_total || 0))}</td></tr>`,
    )
    .join('');

  return `<!doctype html><html><body style="font-family:Georgia,serif;color:#1a1a1a;background:#f7f4ef;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;padding:28px;border:1px solid #e6e0d6">
    <p style="letter-spacing:0.12em;text-transform:uppercase;font-size:12px;color:#777;margin:0 0 8px">Kumar Fancy Store</p>
    <h1 style="font-size:28px;margin:0 0 12px">${copy.headline}</h1>
    <p style="line-height:1.5">${copy.text}</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0">${rows}</table>
    <p style="font-size:18px"><strong>Total ${formatInr(Number(order.total || 0))}</strong></p>
    <p style="color:#777;font-size:13px">Status: ${escapeHtml(order.status)} · Payment: ${escapeHtml(order.payment_status)} (${escapeHtml(order.payment_method)})</p>
  </div></body></html>`;
}

async function sendResendEmail(to: string, subject: string, html: string, text: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('ORDER_EMAIL_FROM') || 'Kumar Fancy Store <onboarding@resend.dev>';
  if (!apiKey) return { skipped: true, reason: 'RESEND_API_KEY not set' };
  if (!to) return { skipped: true, reason: 'no email' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: body?.message || body?.error || `Resend HTTP ${res.status}` };
  }
  return { ok: true, id: body?.id };
}

async function sendWapitoWhatsApp(toE164: string, body: string) {
  const token = Deno.env.get('WAPITO_API_TOKEN');
  if (!token) return { skipped: true, reason: 'WAPITO_API_TOKEN not set' };
  if (!toE164) return { skipped: true, reason: 'no phone' };

  const res = await fetch('https://api.wapito.com/v1/messages/text', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: toE164, body, typing_time: 2 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: data?.message || data?.error?.message || data?.code || `Wapito HTTP ${res.status}`,
    };
  }
  return { ok: true, id: data?.id || data?.message_id || data?.data?.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
  }
  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed.', 405);
  }
  if (!originAllowed(req)) {
    return errorResponse(req, 'Origin is not allowed.', 403);
  }

  try {
    const auth = await requireUser(req);
    if (!auth.user) {
      return errorResponse(req, auth.error, auth.status);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(req, 'Supabase service role is not configured.', 500);
    }

    const body = await req.json().catch(() => ({}));
    const orderId = Number(body?.orderId ?? body?.order_id);
    const event = String(body?.event || '').toLowerCase().trim();

    if (!Number.isFinite(orderId) || orderId <= 0) {
      return errorResponse(req, 'A valid orderId is required.');
    }
    if (!EVENTS.has(event)) {
      return errorResponse(req, 'Unsupported notification event.');
    }
    if (event !== 'placed' && !isAdminUser(auth.user)) {
      return errorResponse(req, 'Only admins can send this notification.', 403);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        'order_id, customer_id, customer_name, customer_email, customer_phone, status, payment_status, payment_method, total',
      )
      .eq('order_id', orderId)
      .maybeSingle();

    if (orderError) {
      return errorResponse(req, orderError.message || 'Could not load order.', 500);
    }
    if (!order) {
      return errorResponse(req, 'Order not found.', 404);
    }
    if (!canAccessOrder(auth.user, order)) {
      return errorResponse(req, 'You can only notify about your own orders.', 403);
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('product_name, quantity, line_total')
      .eq('order_id', orderId);

    const copy = eventCopy(event, order);
    const phone = toE164(String(order.customer_phone || ''));
    const email = String(order.customer_email || '').trim();
    const html = buildEmailHtml(copy, order, items || []);

    const [emailResult, whatsappResult] = await Promise.all([
      sendResendEmail(email, copy.subject, html, copy.text),
      sendWapitoWhatsApp(phone, copy.text),
    ]);

    return jsonResponse(req, {
      ok: true,
      orderId,
      event,
      email: emailResult,
      whatsapp: whatsappResult,
      sms: { skipped: true, reason: 'SMS not used; WhatsApp via Wapito' },
    });
  } catch (err) {
    return errorResponse(req, err?.message || 'Unexpected notify-order error.', 500);
  }
});
