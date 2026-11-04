import { createHmac, timingSafeEqual } from 'node:crypto';

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function rpc(supabaseUrl, anonKey, fnName, args, accessToken = '') {
  const bearer = accessToken || anonKey;
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(args),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      (typeof data === 'string' ? data : null) ||
      `RPC ${fnName} failed (${response.status}).`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }
  return data;
}

async function restSelect(supabaseUrl, anonKey, path, accessToken) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      (typeof data === 'string' ? data : null) ||
      `REST query failed (${response.status}).`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }
  return data;
}

function bearerFromReq(req) {
  const header = String(req.headers.authorization || req.headers.Authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function verifySignature(secret, orderId, paymentId, signature) {
  const expected = createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature || ''), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Dev-only Razorpay API so local checkout works before Edge Functions are deployed.
 * Uses RAZORPAY_* from customer/.env (non-VITE secret stays off the client bundle).
 */
export function razorpayDevApiPlugin() {
  return {
    name: 'razorpay-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/razorpay/')) {
          next();
          return;
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
        const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
        const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
        const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

        try {
          if (!supabaseUrl || !anonKey) {
            sendJson(res, 500, { error: 'Supabase env is missing in customer/.env.' });
            return;
          }
          if (!keyId || !keySecret) {
            sendJson(res, 500, {
              error:
                'Razorpay keys missing. Set VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in customer/.env.',
            });
            return;
          }

          if (req.method === 'POST' && req.url.startsWith('/api/razorpay/create-order')) {
            const body = await readJson(req);
            const orderId = Number(body?.orderId);
            if (!Number.isFinite(orderId) || orderId <= 0) {
              sendJson(res, 400, { error: 'A valid orderId is required.' });
              return;
            }

            const session = await rpc(supabaseUrl, anonKey, 'get_razorpay_payment_session', {
              p_order_id: orderId,
            });

            if (!session || typeof session !== 'object') {
              sendJson(res, 404, { error: 'Order not found or not payable online.' });
              return;
            }

            let razorpayOrderId = String(session.razorpayOrderId || '');
            const amountPaise = Math.round(Number(session.total || 0) * 100);
            if (!Number.isFinite(amountPaise) || amountPaise < 100) {
              sendJson(res, 400, { error: 'Order total is too low for online payment.' });
              return;
            }

            if (!razorpayOrderId) {
              const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
              const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
                method: 'POST',
                headers: {
                  Authorization: `Basic ${auth}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  amount: amountPaise,
                  currency: 'INR',
                  receipt: `order_${orderId}`,
                  notes: { store_order_id: String(orderId) },
                }),
              });
              const razorpayBody = await razorpayRes.json().catch(() => ({}));
              if (!razorpayRes.ok) {
                sendJson(res, 502, {
                  error:
                    razorpayBody?.error?.description ||
                    razorpayBody?.error?.reason ||
                    'Could not create Razorpay order.',
                });
                return;
              }
              razorpayOrderId = String(razorpayBody.id || '');
              if (!razorpayOrderId) {
                sendJson(res, 502, { error: 'Razorpay did not return an order id.' });
                return;
              }
              await rpc(supabaseUrl, anonKey, 'attach_razorpay_order_id', {
                p_order_id: orderId,
                p_razorpay_order_id: razorpayOrderId,
              });
            }

            sendJson(res, 200, {
              keyId,
              razorpayOrderId,
              amount: amountPaise,
              currency: 'INR',
              name: session.name || '',
              email: session.email || '',
              phone: session.phone || '',
              orderId,
            });
            return;
          }

          if (req.method === 'POST' && req.url.startsWith('/api/razorpay/verify')) {
            const body = await readJson(req);
            const orderId = Number(body?.orderId);
            const razorpayOrderId = String(body?.razorpayOrderId || '').trim();
            const razorpayPaymentId = String(body?.razorpayPaymentId || '').trim();
            const razorpaySignature = String(body?.razorpaySignature || '').trim();

            if (!Number.isFinite(orderId) || orderId <= 0) {
              sendJson(res, 400, { error: 'A valid orderId is required.' });
              return;
            }
            if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
              sendJson(res, 400, { error: 'Missing Razorpay payment details.' });
              return;
            }
            if (
              !verifySignature(
                keySecret,
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature,
              )
            ) {
              sendJson(res, 401, { error: 'Invalid payment signature.' });
              return;
            }

            const result = await rpc(supabaseUrl, anonKey, 'finalize_razorpay_payment', {
              p_order_id: orderId,
              p_razorpay_order_id: razorpayOrderId,
              p_razorpay_payment_id: razorpayPaymentId,
              p_razorpay_signature: razorpaySignature,
            });

            sendJson(res, 200, result || { ok: true, orderId, paymentStatus: 'Paid' });
            return;
          }

          if (req.method === 'POST' && req.url.startsWith('/api/razorpay/cancel-order')) {
            const accessToken = bearerFromReq(req);
            if (!accessToken) {
              sendJson(res, 401, { error: 'Sign in to cancel your order.' });
              return;
            }

            const body = await readJson(req);
            const orderId = Number(body?.orderId);
            if (!Number.isFinite(orderId) || orderId <= 0) {
              sendJson(res, 400, { error: 'A valid orderId is required.' });
              return;
            }

            const rows = await restSelect(
              supabaseUrl,
              anonKey,
              `orders?select=order_id,customer_id,status,payment_status,payment_method,razorpay_payment_id&order_id=eq.${orderId}&limit=1`,
              accessToken,
            );
            const order = Array.isArray(rows) ? rows[0] : rows;
            if (!order) {
              sendJson(res, 404, { error: 'Order not found.' });
              return;
            }
            if (order.status !== 'Pending') {
              sendJson(res, 400, { error: 'Only pending orders can be cancelled.' });
              return;
            }

            let refundId = null;
            if (order.payment_status === 'Paid') {
              if (order.payment_method !== 'razorpay') {
                sendJson(res, 400, {
                  error: 'Paid orders without Razorpay must be refunded by the store.',
                });
                return;
              }
              const paymentId = String(order.razorpay_payment_id || '').trim();
              if (!paymentId) {
                sendJson(res, 400, {
                  error: 'Missing Razorpay payment id. Contact the store for a refund.',
                });
                return;
              }

              const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
              const refundRes = await fetch(
                `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({}),
                },
              );
              const refundBody = await refundRes.json().catch(() => ({}));
              const alreadyRefunded =
                refundRes.status === 400 &&
                String(
                  refundBody?.error?.description ||
                    refundBody?.error?.code ||
                    refundBody?.error?.reason ||
                    '',
                )
                  .toLowerCase()
                  .includes('already');

              if (!refundRes.ok && !alreadyRefunded) {
                sendJson(res, 502, {
                  error:
                    refundBody?.error?.description ||
                    refundBody?.error?.reason ||
                    `Razorpay refund failed (${refundRes.status}). Order was not cancelled.`,
                });
                return;
              }
              refundId = refundBody?.id || null;
            }

            const cancelled = await rpc(
              supabaseUrl,
              anonKey,
              'cancel_my_order',
              { p_order_id: orderId },
              accessToken,
            );

            sendJson(res, 200, {
              ok: true,
              orderId,
              status: cancelled?.status || 'Cancelled',
              paymentStatus: cancelled?.payment_status || order.payment_status,
              refundId,
            });
            return;
          }

          sendJson(res, 404, { error: 'Not found.' });
        } catch (err) {
          sendJson(res, err.status && err.status < 500 ? err.status : 500, {
            error: err.message || 'Payment API error.',
          });
        }
      });
    },
  };
}
