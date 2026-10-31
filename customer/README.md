# Kumar Fancy Store — Customer

Customer storefront for Kumar Fancy Store. Separate Vite + React app from the admin panel at the repo root.

For the full clone, Supabase, and dual-app setup, see the root [README.md](../README.md).

## Quick start

1. Copy the same Supabase keys used by admin:

```bash
copy ..\.env .env
```

2. Install and run:

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
| `/checkout` | Checkout form |
| `/account` | Sign in / create account |

Active products come from the shared Supabase catalog. Wishlists are stored for the signed-in user.
