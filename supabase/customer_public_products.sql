-- Run once in the Supabase SQL Editor if the customer shop cannot see products.
-- Active products become readable without signing in. Admin writes stay unchanged.

drop policy if exists "Public can read active products" on public.products;

create policy "Public can read active products"
  on public.products for select
  to anon
  using (product_status = 'Active');
