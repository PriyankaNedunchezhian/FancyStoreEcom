import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { passwordPolicyError } from '../src/utils/passwordPolicy.js';
import { isAdminUser } from '../src/supabase/roles.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;

function assert(name, condition) {
  if (!condition) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    return;
  }
  console.log(`PASS  ${name}`);
}

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8');
}

assert('rejects short passwords', Boolean(passwordPolicyError('Ab1')));
assert('rejects letters-only passwords', Boolean(passwordPolicyError('abcdefgh')));
assert('accepts mixed passwords', passwordPolicyError('StoreKey9') === '');
assert('admin role is app_metadata only', isAdminUser({ app_metadata: { role: 'admin' } }) === true);
assert('customer cannot spoof admin via user_metadata', isAdminUser({ user_metadata: { role: 'admin' } }) === false);

function paymentMatchesOrder(payment, order) {
  const amountPaise = Math.round(Number(order.total || 0) * 100);
  return (
    payment.status === 'captured' &&
    Number(payment.amount) === amountPaise &&
    String(payment.currency || '').toUpperCase() === 'INR' &&
    Boolean(order.razorpay_order_id) &&
    payment.order_id === order.razorpay_order_id
  );
}

assert(
  'rejects swapped payment onto a different unpaid order',
  paymentMatchesOrder(
    { status: 'captured', amount: 10000, currency: 'INR', order_id: 'order_cheap' },
    { total: 3700, razorpay_order_id: 'order_expensive' },
  ) === false,
);
assert(
  'rejects payment when store razorpay_order_id is missing',
  paymentMatchesOrder(
    { status: 'captured', amount: 10000, currency: 'INR', order_id: 'order_cheap' },
    { total: 100, razorpay_order_id: '' },
  ) === false,
);
assert(
  'accepts matching captured payment',
  paymentMatchesOrder(
    { status: 'captured', amount: 10000, currency: 'INR', order_id: 'order_abc' },
    { total: 100, razorpay_order_id: 'order_abc' },
  ) === true,
);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

assert('escapes HTML in notification names', escapeHtml('<img src=x onerror=alert(1)>').includes('&lt;img'));

const verifyFn = read('supabase/functions/verify-razorpay-payment/index.ts');
const createFn = read('supabase/functions/create-razorpay-order/index.ts');
const notifyFn = read('supabase/functions/notify-order/index.ts');
const config = read('supabase/config.toml');
const cors = read('supabase/functions/_shared/security.ts');
const sql = read('supabase/security_hardening.sql');
const adminRoles = read('supabase/admin_roles.sql');

assert('create-razorpay-order requires a signed-in user', createFn.includes('requireUser(req)'));
assert('create-razorpay-order checks order ownership', createFn.includes('canAccessOrder'));
assert('verify-razorpay-payment requires a signed-in user', verifyFn.includes('requireUser(req)'));
assert('verify-razorpay-payment checks amount against Razorpay', verifyFn.includes('paymentMatchesOrder'));
assert('verify-razorpay-payment requires stored razorpay_order_id', verifyFn.includes('order.razorpay_order_id !== razorpayOrderId'));
assert('notify-order requires a signed-in user', notifyFn.includes('requireUser(req)'));
assert('notify-order escapes HTML', notifyFn.includes('escapeHtml'));
assert('edge functions verify JWT', /verify_jwt = true/.test(config) && !/verify_jwt = false/.test(config));
assert('CORS does not allow wildcard origins', !cors.includes("Access-Control-Allow-Origin': '*'"));
assert('payment RPCs require auth.uid()', sql.includes("raise exception 'Sign in to continue payment.'"));
assert('finalize requires stored Razorpay order id', sql.includes("raise exception 'Start payment before verifying.'"));
assert('order RLS is owner-or-admin', adminRoles.includes('customer_id = auth.uid()') && adminRoles.includes('public.is_admin()'));
assert('is_admin reads app_metadata only', adminRoles.includes("auth.jwt() -> 'app_metadata' ->> 'role'"));
assert(
  'seed_orders blocks non-admin authenticated callers',
  read('supabase/seed_orders.sql').includes('if auth.uid() is not null and not public.is_admin()'),
);
assert(
  'seed_wishlists blocks non-admin authenticated callers',
  read('supabase/seed_wishlists.sql').includes('if auth.uid() is not null and not public.is_admin()'),
);
assert(
  'Razorpay secret is not hardcoded in app source',
  !read('customer/src/supabase/payments.js').includes('RAZORPAY_KEY_SECRET=') &&
    !read('src/supabase/config.js').includes('RAZORPAY_KEY_SECRET='),
);
assert(
  'password policy is enforced in customer sign-up',
  read('customer/src/context/AuthContext.jsx').includes('passwordPolicyError(password)'),
);
assert(
  'product upload rejects SVG',
  read('src/supabase/products.js').includes("ALLOWED_IMAGE_TYPES") &&
    read('src/supabase/products.js').includes('image/jpeg'),
);

if (failed) {
  console.error(`\n${failed} security check(s) failed.`);
  process.exit(1);
}
console.log('\nAll security checks passed.');
