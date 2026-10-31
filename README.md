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
6. Create a user for admin (and for testing the customer sign-in):
   - **Authentication → Users → Add user** (email + password), **or**
   - Turn off **Confirm email** under **Authentication → Providers → Email** while developing, then sign up from the customer app

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
| `/checkout` | Guest or signed-in checkout (cash on delivery) |
| `/order/:id/confirmation` | Order placed |
| `/orders` | My orders (signed in) |
| `/orders/:id` | Order detail (signed in) |
| `/account` | Sign in / create account |

Checkout creates a **Pending / Unpaid** order with **cash on delivery**. Guests can place orders; sign in before checkout to see them under **My Orders**. Admin confirms stock from the Orders screen as before.

Sign in on the customer account page with the **same email and password** as admin (same Supabase user) to load the catalog when public product policy is not applied yet, and to save wishlists.

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
| Guest order not in My Orders | Expected — guest orders have no account. Sign in before placing to track them. |
| `email rate limit exceeded` on create account | Supabase free email limit. Turn off **Confirm email** in Auth settings, wait about an hour, or sign in with an existing user instead of creating a new one. |
| Missing env / blank catalog | Check `.env` in the repo root and `customer/.env`. Restart `npm run dev` after changing env files. |
| Admin Vite crashes watching images on Windows | Root `vite.config.js` ignores image files in the watcher. Restart the admin server. |

---

## License

Private project — use for Kumar Fancy Store only unless you change this.
