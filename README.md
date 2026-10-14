# Fancy Store Admin

React (Vite) admin panel with Supabase Auth, Postgres product catalog, and Storage images.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a project at [Supabase](https://supabase.com/dashboard).

3. In Supabase → **Project Settings → API**, copy:
   - Project URL
   - `anon` `public` key

4. Copy env file and fill in values:

```bash
copy .env.example .env
```

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

5. In Supabase → **SQL Editor**, run the full script in [`supabase/schema.sql`](supabase/schema.sql).  
   This creates:
   - `products` table with sequential `product_id` starting at **100**
   - RLS policies for authenticated admins
   - public `products` storage bucket + policies

6. Create an admin user:
   - **Authentication → Users → Add user** (email + password), or
   - Sign up once from the app if you enable email signup

7. Start the app:

```bash
npm run dev
```

Open the local URL (usually `http://localhost:5173`) and sign in.

## Routes

| Path | Description |
|------|-------------|
| `/login` | Email/password login + forgot password |
| `/dashboard` | Home (empty placeholder) |
| `/products` | Product list (CRUD) |
| `/products/new` | Create product |
| `/products/:id/edit` | Edit product |
| `/orders` | Order section (placeholder) |
| `/profile` | Admin profile + password |

## Product catalog

- Sequential **product ID** starts at **100** (Postgres sequence)
- Fields: name, category, description, image, size, MRP, selling price, discount %, colour, material, weight, brand, stock status, available quantity, return eligibility, product status
- Stock status: In stock / Out of stock
- Return eligibility: Returnable / Non-returnable
- Images stored in the Supabase Storage bucket `products`

## Admin shell

- Black sidebar: Home, Product, Order
- White top navbar with Profile menu (admin details, update password, sign out)

## Next

- Order Management
