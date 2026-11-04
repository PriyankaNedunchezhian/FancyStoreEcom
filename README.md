# Kumar Fancy Store

Jewellery e-commerce for **Kumar Fancy Store**. This repository has two React (Vite) apps that share one Supabase project:

| App | Folder | Local URL | Purpose |
|-----|--------|-----------|---------|
| Admin | repo root | http://localhost:5173 | Products, orders, wishlist overview, dashboard |
| Customer | `customer/` | http://localhost:5174 | Shop, product pages, bag, wishlist, account |

---

## What you need

Install these before you start:

- **[Node.js](https://nodejs.org/)** 18 or newer (includes `npm`)
- **Git**
- A free **[Supabase](https://supabase.com/)** project

You do **not** need a separate backend server. Both apps talk to Supabase (Auth, Postgres, Storage).

---

## 1. Clone the repository

```bash
git clone https://github.com/PriyankaNedunchezhian/FancyStoreEcom.git
cd FancyStoreEcom
```

If you use SSH:

```bash
git clone git@github.com:PriyankaNedunchezhian/FancyStoreEcom.git
cd FancyStoreEcom
```

---

## 2. Create and configure Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and create a project (or use an existing one).
2. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key
3. Open **SQL Editor** and run the full script in [`supabase/schema.sql`](supabase/schema.sql).  
   This creates:
   - `products` (IDs start at **100**)
   - `wishlists`
   - `orders` / `order_items`
   - Storage bucket `products` for images
   - Row Level Security policies
4. Run [`supabase/customer_public_products.sql`](supabase/customer_public_products.sql) once so the customer shop can read **Active** products without an admin session.
5. Run [`supabase/customer_orders.sql`](supabase/customer_orders.sql) once so the storefront can place COD orders (guest or signed-in) via `place_customer_order`.
6. Run [`supabase/admin_roles.sql`](supabase/admin_roles.sql) once to add `is_admin()` and lock catalog/order writes to admins.
7. Run [`supabase/razorpay_orders.sql`](supabase/razorpay_orders.sql) once for Razorpay columns and online checkout via `place_customer_order`.
8. Run [`supabase/shipping_fees.sql`](supabase/shipping_fees.sql) once for flat shipping (₹79 under ₹999, free at ₹999+).
9. Run [`supabase/customer_addresses.sql`](supabase/customer_addresses.sql) once for saved delivery addresses on the customer account page.
10. Create users:
   - **Admin:** Authentication → Users → Add user (email + password), then open that user → **App Metadata** and set:
     ```json
     { "role": "admin" }
     ```
     Sign out and sign in again on the admin app so the JWT refreshes.
   - **Customers:** sign up from the customer storefront. Do **not** set `app_metadata.role` to `admin` for shoppers.
   - While developing, you can turn off **Confirm email** under Authentication → Providers → Email.

Optional seeds (SQL Editor):

- [`supabase/seed_orders.sql`](supabase/seed_orders.sql)
- [`supabase/seed_wishlists.sql`](supabase/seed_wishlists.sql)

---

## 3. Admin app — install and run

From the **repo root**:

```bash
copy .env.example .env
```

On macOS / Linux:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Then:

```bash
npm install
npm run dev
```

Open **http://localhost:5173** and sign in with the user you created in Supabase.

### Admin routes

| Path | Description |
|------|-------------|
| `/login` | Admin sign in / password reset |
| `/dashboard` | Overview |
| `/products` | Product catalog (CRUD) |
| `/products/new` | Add product |
| `/products/:id/edit` | Edit product |
| `/orders` | Orders |
| `/wishlist` | Wishlist overview |
| `/profile` | Profile and password |

---

## 4. Customer app — install and run

The customer app is a **second** Vite project. Use the **same** Supabase URL and anon key as admin.

```bash
cd customer
copy ..\.env .env
```

On macOS / Linux:

```bash
cd customer
cp ../.env .env
```

Or copy from the example and fill in the same values:

```bash
copy .env.example .env
```

Then:

```bash
npm install
npm run dev
```

Open **http://localhost:5174**.

### Customer routes

| Path | Description |
|------|-------------|
| `/` | Home |
| `/shop` | Collection (category, search, sort) |
| `/product/:id` | Product detail |
| `/cart` | Bag |
| `/wishlist` | Saved pieces (needs sign in) |
| `/checkout` | Guest or signed-in checkout (COD or Razorpay) |
| `/order/:id/confirmation` | Order placed |
| `/orders` | My orders (signed in) |
| `/orders/:id` | Order detail (signed in) |
| `/account` | Sign in / create account, profile, saved addresses |

Checkout supports **cash on delivery** (Pending / Unpaid) and **Razorpay** (Pending / Paid after signature verify). If Razorpay is closed before paying, signed-in shoppers can finish payment from **My Orders** / order detail (**Pay**). Shipping is **₹79**, or **free** when the merchandise subtotal is **₹999+** (computed in `place_customer_order`). Guests can place orders; signed-in shoppers can edit profile, save up to **5** addresses, and prefill checkout. Admin confirms stock from the Orders screen as before.

Add the public Razorpay key to `customer/.env`:

```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
```

Sign in on the customer account page with the **same email and password** as admin (same Supabase user) to load the catalog when public product policy is not applied yet, and to save wishlists.

### Razorpay (online payment)

1. Create a [Razorpay](https://razorpay.com/) account and copy **Key Id** + **Key Secret** (test mode is fine while developing).
2. Run [`supabase/razorpay_orders.sql`](supabase/razorpay_orders.sql) in the SQL Editor (if you have not already).
3. Set keys in `customer/.env`:

```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

4. In the SQL Editor, run the insert from [`supabase/razorpay_secret.example.sql`](supabase/razorpay_secret.example.sql) with your real `RAZORPAY_KEY_SECRET` value (required to mark orders Paid).
5. Restart the customer app (`npm run dev` in `customer/`). Local checkout uses a Vite `/api/razorpay/*` helper so you do **not** need Edge Functions while developing.

#### Production (Edge Functions)

6. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), log in, and link the project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

7. Set function secrets (never put the secret in `VITE_*` env vars):

```bash
npx supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxxxxx RAZORPAY_KEY_SECRET=your_razorpay_secret
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to Edge Functions.

8. Deploy the functions:

```bash
npx supabase functions deploy create-razorpay-order
npx supabase functions deploy verify-razorpay-payment
```

Flow: place store order (`payment_method=razorpay`, Unpaid) → create Razorpay order → Checkout.js → verify signature → mark **Paid**.

### Order notifications (email + WhatsApp)

Checkout and admin status changes call the `notify-order` Edge Function (soft-fail — orders never block if messaging fails).

| Channel | Provider |
|---------|----------|
| Email | [Resend](https://resend.com) |
| WhatsApp | [Wapito](https://wapito.com/docs/api/messages/send-text/) (no SMS — Wapito is WhatsApp-only) |

| Event | Trigger |
|-------|---------|
| `placed` | COD place, or Razorpay paid (including Pay from My Orders) |
| `confirmed` / `shipped` | Admin order status change |
| `cancelled` | Admin cancel, or customer self-cancel (Pending) |

1. Create a Resend API key (test from-address: `onboarding@resend.dev`).
2. Create a [Wapito](https://wapito.com) channel, link your WhatsApp number (QR), and copy the channel token (`wpt_...`).
3. Deploy and set secrets:

```bash
npx.cmd supabase functions deploy notify-order --yes
npx.cmd supabase secrets set RESEND_API_KEY=re_xxx ORDER_EMAIL_FROM="Kumar Fancy Store <onboarding@resend.dev>" WAPITO_API_TOKEN=wpt_xxx
```

Phones are normalized to E.164 with default country **+91**. Email needs `customer_email`; WhatsApp needs `customer_phone`. Wapito is an unofficial WhatsApp API — warm up the number and avoid spammy bursts.

### Customer cancel (Pending only)

Signed-in shoppers can cancel their own **Pending** orders from **My Orders** / order detail. Confirmed and later statuses stay admin-only.

| Payment | What happens |
|---------|----------------|
| COD / Razorpay **Unpaid** | `cancel_my_order` RPC → status **Cancelled**, stock restored if deducted |
| Razorpay **Paid** | Refund via Razorpay, then cancel → **Cancelled** + **Refunded** |

1. Run [`supabase/customer_cancel_order.sql`](supabase/customer_cancel_order.sql) in the SQL Editor.
2. Local `npm run dev` uses `/api/razorpay/cancel-order` (same Razorpay keys as checkout).
3. Production — deploy the cancel function (reuses `RAZORPAY_*` secrets):

```bash
npx.cmd supabase functions deploy cancel-customer-order --yes
```

---

## 5. Run both apps together

Use **two terminals**:

**Terminal 1 — Admin**

```bash
cd FancyStoreEcom
npm run dev
```

**Terminal 2 — Customer**

```bash
cd FancyStoreEcom\customer
npm run dev
```

| App | URL |
|-----|-----|
| Admin | http://localhost:5173 |
| Customer | http://localhost:5174 |

---

## Build for production

**Admin**

```bash
npm run build
npm run preview
```

**Customer**

```bash
cd customer
npm run build
npm run preview
```

---

## Project layout

```text
FancyStoreEcom/
├── src/                    # Admin React app
├── supabase/
│   ├── schema.sql          # Full database setup (run first)
│   ├── customer_public_products.sql
│   ├── customer_orders.sql # Place-order RPC + payment_method
│   ├── admin_roles.sql     # is_admin() + tighter RLS
│   ├── razorpay_orders.sql # Razorpay columns + COD/online place-order
│   ├── shipping_fees.sql   # shipping_total + ₹79 / free at ₹999+
│   ├── customer_addresses.sql # Saved delivery addresses (max 5)
│   ├── customer_cancel_order.sql # Customer Pending self-cancel RPC
│   ├── functions/          # Edge Functions (Razorpay + notify + cancel)
│   ├── seed_orders.sql
│   └── seed_wishlists.sql
├── customer/               # Customer storefront
│   ├── src/
│   ├── .env.example
│   └── package.json
├── .env.example
├── package.json
└── README.md
```

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| Customer shop shows no products | Run `supabase/customer_public_products.sql`, or sign in on `/account` with the admin email/password. Confirm products are **Active** in admin. |
| Place order fails / RPC missing | Run `supabase/customer_orders.sql` in the SQL Editor, then try checkout again. |
| Online payment fails / functions missing | Run `razorpay_orders.sql`, deploy the two Edge Functions, set `RAZORPAY_*` secrets, and set `VITE_RAZORPAY_KEY_ID` in `customer/.env`. |
| No order email / WhatsApp | Deploy `notify-order`, set `RESEND_API_KEY` + `WAPITO_API_TOKEN`. Checkout still works if messaging is missing (soft-fail). |
| Admin login says “Admin access only” | Set App Metadata `{ "role": "admin" }` on that user, run `admin_roles.sql`, then sign out/in. |
| Guest order not in My Orders | Expected — guest orders have no account. Sign in before placing to track them. |
| Razorpay order created but unpaid | Customer closed Checkout. Order stays Unpaid; complete payment or handle in admin. |
| Customer cancel fails / RPC missing | Run `customer_cancel_order.sql`. Paid cancel also needs Razorpay keys and (in production) `cancel-customer-order` deployed. |
| Cannot cancel after Confirmed | Expected — only **Pending** orders are customer-cancellable. Admin can still cancel Confirmed. |
| `email rate limit exceeded` on create account | Supabase free email limit. Turn off **Confirm email** in Auth settings, wait about an hour, or sign in with an existing user instead of creating a new one. |
| Missing env / blank catalog | Check `.env` in the repo root and `customer/.env`. Restart `npm run dev` after changing env files. |
| Admin Vite crashes watching images on Windows | Root `vite.config.js` ignores image files in the watcher. Restart the admin server. |

---

## License

Private project — use for Kumar Fancy Store only unless you change this.
