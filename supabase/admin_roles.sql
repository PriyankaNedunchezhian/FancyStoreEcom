-- Stage 1: Admin vs customer roles.
-- Run once in Supabase SQL Editor after schema.sql / customer_orders.sql.
-- Then set the admin user's App Metadata to: { "role": "admin" }

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can read products" on public.products;
drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Authenticated users can update products" on public.products;
drop policy if exists "Authenticated users can delete products" on public.products;
drop policy if exists "Admins can read all products" on public.products;
drop policy if exists "Authenticated can read active products" on public.products;
drop policy if exists "Admins can insert products" on public.products;
drop policy if exists "Admins can update products" on public.products;
drop policy if exists "Admins can delete products" on public.products;
drop policy if exists "Public can read active products" on public.products;

create policy "Public can read active products"
  on public.products for select
  to anon
  using (product_status = 'Active');

create policy "Authenticated can read active products"
  on public.products for select
  to authenticated
  using (product_status = 'Active' or public.is_admin());

create policy "Admins can insert products"
  on public.products for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update products"
  on public.products for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete products"
  on public.products for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: product images
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can upload product images" on storage.objects;
drop policy if exists "Authenticated users can update product images" on storage.objects;
drop policy if exists "Authenticated users can delete product images" on storage.objects;
drop policy if exists "Admins can upload product images" on storage.objects;
drop policy if exists "Admins can update product images" on storage.objects;
drop policy if exists "Admins can delete product images" on storage.objects;

create policy "Admins can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'products' and public.is_admin());

create policy "Admins can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'products' and public.is_admin());

create policy "Admins can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'products' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Wishlists
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can read wishlists" on public.wishlists;
drop policy if exists "Customers can read own wishlist rows" on public.wishlists;
drop policy if exists "Admins can read wishlists" on public.wishlists;
drop policy if exists "Customers can insert own wishlist rows" on public.wishlists;
drop policy if exists "Customers can delete own wishlist rows" on public.wishlists;

create policy "Customers can read own wishlist rows"
  on public.wishlists for select
  to authenticated
  using (customer_id = auth.uid());

create policy "Admins can read wishlists"
  on public.wishlists for select
  to authenticated
  using (public.is_admin());

create policy "Customers can insert own wishlist rows"
  on public.wishlists for insert
  to authenticated
  with check (auth.uid() = customer_id);

create policy "Customers can delete own wishlist rows"
  on public.wishlists for delete
  to authenticated
  using (auth.uid() = customer_id);

-- ---------------------------------------------------------------------------
-- Orders / order items
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can read orders" on public.orders;
drop policy if exists "Authenticated users can insert orders" on public.orders;
drop policy if exists "Authenticated users can update orders" on public.orders;
drop policy if exists "Authenticated users can delete orders" on public.orders;
drop policy if exists "Customers can read own orders" on public.orders;
drop policy if exists "Admins can read orders" on public.orders;
drop policy if exists "Admins can insert orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
drop policy if exists "Admins can delete orders" on public.orders;

create policy "Customers can read own orders"
  on public.orders for select
  to authenticated
  using (customer_id = auth.uid());

create policy "Admins can read orders"
  on public.orders for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert orders"
  on public.orders for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update orders"
  on public.orders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete orders"
  on public.orders for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Authenticated users can read order items" on public.order_items;
drop policy if exists "Authenticated users can insert order items" on public.order_items;
drop policy if exists "Authenticated users can update order items" on public.order_items;
drop policy if exists "Authenticated users can delete order items" on public.order_items;
drop policy if exists "Customers can read own order items" on public.order_items;
drop policy if exists "Admins can read order items" on public.order_items;
drop policy if exists "Admins can insert order items" on public.order_items;
drop policy if exists "Admins can update order items" on public.order_items;
drop policy if exists "Admins can delete order items" on public.order_items;

create policy "Customers can read own order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.order_id = order_items.order_id
        and o.customer_id = auth.uid()
    )
  );

create policy "Admins can read order items"
  on public.order_items for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert order items"
  on public.order_items for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update order items"
  on public.order_items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete order items"
  on public.order_items for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Stock RPCs: admin only
-- ---------------------------------------------------------------------------
create or replace function public.confirm_order_stock(p_order_id bigint)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.orders;
  item record;
  available integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can confirm orders.';
  end if;

  select * into ord from public.orders where order_id = p_order_id for update;
  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if ord.status = 'Cancelled' then
    raise exception 'Cannot confirm a cancelled order';
  end if;

  if ord.status in ('Shipped', 'Delivered') then
    raise exception 'Order is already %', ord.status;
  end if;

  if not ord.stock_deducted then
    for item in
      select * from public.order_items where order_id = p_order_id
    loop
      select available_quantity into available
      from public.products
      where product_id = item.product_id
      for update;

      if available is null then
        raise exception 'Product % not found', item.product_id;
      end if;

      if available < item.quantity then
        raise exception
          'Insufficient stock for "%": need %, have %',
          item.product_name,
          item.quantity,
          available;
      end if;

      update public.products
      set
        available_quantity = available_quantity - item.quantity,
        stock_status = case
          when available_quantity - item.quantity <= 0 then 'Out of stock'
          else 'In stock'
        end,
        updated_at = now()
      where product_id = item.product_id;
    end loop;

    ord.stock_deducted := true;
  end if;

  update public.orders
  set
    status = 'Confirmed',
    stock_deducted = true,
    updated_at = now()
  where order_id = p_order_id
  returning * into ord;

  return ord;
end;
$$;

create or replace function public.cancel_order_restore_stock(p_order_id bigint)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.orders;
  item record;
begin
  if not public.is_admin() then
    raise exception 'Only admins can cancel orders.';
  end if;

  select * into ord from public.orders where order_id = p_order_id for update;
  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if ord.status in ('Delivered', 'Cancelled') then
    raise exception 'Order cannot be cancelled from status %', ord.status;
  end if;

  if ord.stock_deducted then
    for item in
      select * from public.order_items where order_id = p_order_id
    loop
      update public.products
      set
        available_quantity = available_quantity + item.quantity,
        stock_status = case
          when available_quantity + item.quantity > 0 then 'In stock'
          else 'Out of stock'
        end,
        updated_at = now()
      where product_id = item.product_id;
    end loop;
  end if;

  update public.orders
  set
    status = 'Cancelled',
    stock_deducted = false,
    updated_at = now()
  where order_id = p_order_id
  returning * into ord;

  return ord;
end;
$$;

revoke all on function public.confirm_order_stock(bigint) from public;
revoke all on function public.cancel_order_restore_stock(bigint) from public;
grant execute on function public.confirm_order_stock(bigint) to authenticated;
grant execute on function public.cancel_order_restore_stock(bigint) to authenticated;
