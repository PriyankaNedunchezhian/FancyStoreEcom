# Kumar Fancy Store — Customer

Customer storefront for Kumar Fancy Store. Separate Vite + React app from the admin panel at the repo root.

For the full clone, Supabase, and dual-app setup, see the root [README.md](../README.md).

## Quick start

1. Copy the same Supabase keys used by admin:

```bash
copy ..\.env .env
```

2. In Supabase SQL Editor, run (once each if not already applied):
   - [`../supabase/customer_public_products.sql`](../supabase/customer_public_products.sql)
   - [`../supabase/customer_orders.sql`](../supabase/customer_orders.sql)
   - [`../supabase/admin_roles.sql`](../supabase/admin_roles.sql) — then set admin App Metadata `{ "role": "admin" }`
   - [`../supabase/razorpay_orders.sql`](../supabase/razorpay_orders.sql) — for online payment
   - [`../supabase/shipping_fees.sql`](../supabase/shipping_fees.sql) — ₹79 shipping, free at ₹999+
   - [`../supabase/customer_addresses.sql`](../supabase/customer_addresses.sql) — saved addresses

3. For Razorpay, set `VITE_RAZORPAY_KEY_ID` in `.env` and deploy the Edge Functions (see root README).

4. Install and run:

```bash
npm install
npm run dev
```

Opens at [http://localhost:5174](http://localhost:5174). Admin stays on port **5173**.

## Routes

| Path | Screen |
|------|--------|
| `/` | Home |
| `/shop` | Collection (category, search, sort) |
| `/product/:id` | Product detail |
| `/cart` | Bag |
| `/wishlist` | Saved pieces |
| `/checkout` | Guest or signed-in checkout (COD or Razorpay) |
| `/order/:id/confirmation` | Order placed |
| `/orders` | My orders (signed in) |
| `/orders/:id` | Order detail |
| `/account` | Sign in, profile, password, saved addresses |

Active products come from the shared Supabase catalog. Checkout supports **COD** (Unpaid) and **Razorpay** (Paid after verify). Shipping is **₹79**, or free at **₹999+** subtotal. Signed-in shoppers can save up to 5 addresses and prefill checkout. Wishlists and My Orders need a signed-in user. Admin confirms stock from the admin Orders UI.
