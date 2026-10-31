# Kumar Fancy Store — Customer

Customer storefront for Kumar Fancy Store. This is a separate Vite + React app from the admin panel at the repo root.

## Run

```bash
cd customer
npm install
npm run dev
```

Opens at [http://localhost:5174](http://localhost:5174). The admin app stays on port 5173.

## Routes

| Path | Screen |
|------|--------|
| `/` | Home |
| `/shop` | Collection, with category, search, and sort |
| `/product/:id` | Product detail |
| `/cart` | Bag |
| `/wishlist` | Saved pieces |
| `/checkout` | Checkout form shell |
| `/account` | Customer sign in / create account |

The shop and product pages read active products from the same Supabase catalog as admin. Wishlists are saved on the signed-in customer account. Copy the admin `.env` into `customer/.env` before starting the app.
