-- Fancy Store Admin — run this in Supabase SQL Editor

-- Sequential product IDs starting at 100
create sequence if not exists products_product_id_seq start with 100 increment by 1;

create table if not exists public.products (
  product_id bigint primary key default nextval('products_product_id_seq'),
  name text not null,
  category text not null default 'Other',
  description text not null default '',
  image_url text not null default '',
  image_urls text[] not null default '{}',
  size text not null default '',
  mrp numeric(12, 2) not null default 0,
  selling_price numeric(12, 2) not null default 0,
  discount numeric(8, 2) not null default 0,
  colour text not null default '',
  material text not null default '',
  weight text not null default '',
  brand text not null default '',
  stock_status text not null default 'In stock',
  available_quantity integer not null default 0,
  return_eligibility text not null default 'Returnable',
  product_status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter sequence products_product_id_seq owned by public.products.product_id;

-- Multiple images (max 6); migrate legacy single image_url when needed
alter table public.products
  add column if not exists image_urls text[] not null default '{}';

update public.products
set image_urls = array[image_url]
where coalesce(image_url, '') <> ''
  and cardinality(image_urls) = 0;

alter table public.products drop constraint if exists products_image_urls_max;
alter table public.products
  add constraint products_image_urls_max
  check (cardinality(image_urls) <= 6);

alter table public.products enable row level security;

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

-- Storage bucket for product images (also create via Dashboard → Storage if preferred)
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

drop policy if exists "Authenticated users can upload product images" on storage.objects;
drop policy if exists "Authenticated users can update product images" on storage.objects;
drop policy if exists "Authenticated users can delete product images" on storage.objects;
drop policy if exists "Admins can upload product images" on storage.objects;
drop policy if exists "Admins can update product images" on storage.objects;
drop policy if exists "Admins can delete product images" on storage.objects;
drop policy if exists "Public can read product images" on storage.objects;

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

create policy "Public can read product images"
  on storage.objects for select
  to public
  using (bucket_id = 'products');

-- Customer wishlists (one row per customer + product)
create table if not exists public.wishlists (
  id bigint generated always as identity primary key,
  customer_id uuid not null references auth.users (id) on delete cascade,
  product_id bigint not null references public.products (product_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create index if not exists wishlists_product_id_idx on public.wishlists (product_id);
create index if not exists wishlists_customer_id_idx on public.wishlists (customer_id);

alter table public.wishlists enable row level security;

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

-- Orders + line items
create sequence if not exists orders_order_id_seq start with 1000 increment by 1;

create table if not exists public.orders (
  order_id bigint primary key default nextval('orders_order_id_seq'),
  customer_id uuid references auth.users (id) on delete set null,
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  shipping_address text not null default '',
  status text not null default 'Pending'
    check (status in ('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled')),
  payment_status text not null default 'Unpaid'
    check (payment_status in ('Unpaid', 'Paid', 'Refunded')),
  payment_method text not null default 'cod'
    check (payment_method in ('cod', 'razorpay', 'stripe')),
  subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  notes text not null default '',
  stock_deducted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter sequence orders_order_id_seq owned by public.orders.order_id;

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (order_id) on delete cascade,
  product_id bigint not null references public.products (product_id) on delete restrict,
  product_name text not null default '',
  unit_price numeric(12, 2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  line_total numeric(12, 2) not null default 0,
  unique (order_id, product_id)
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_customer_id_idx on public.orders (customer_id);

alter table public.orders
  add column if not exists payment_method text not null default 'cod';

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('cod', 'razorpay', 'stripe'));

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

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

-- Deduct inventory when confirming an order
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

-- Cancel order and restore inventory if it was deducted
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

create or replace function public.place_customer_order(
  p_customer jsonb,
  p_items jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_phone text;
  v_email text;
  v_address text;
  v_method text;
  v_order_id bigint;
  v_subtotal numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  elem jsonb;
  v_product_id bigint;
  v_qty integer;
  prod public.products;
  v_unit numeric(12, 2);
  v_line numeric(12, 2);
  lines_count integer := 0;
begin
  v_name := trim(coalesce(p_customer->>'name', ''));
  v_phone := trim(coalesce(p_customer->>'phone', ''));
  v_email := trim(coalesce(p_customer->>'email', ''));
  v_address := trim(coalesce(p_customer->>'address', ''));
  v_method := lower(trim(coalesce(p_customer->>'payment_method', 'cod')));

  if v_name = '' then
    raise exception 'Full name is required.';
  end if;
  if v_phone = '' then
    raise exception 'Phone is required.';
  end if;
  if v_address = '' then
    raise exception 'Shipping address is required.';
  end if;
  if v_method is distinct from 'cod' then
    raise exception 'Only cash on delivery is available right now.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one product to the order.';
  end if;

  for elem in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := coalesce(
      nullif(elem->>'productId', '')::bigint,
      nullif(elem->>'product_id', '')::bigint
    );
    v_qty := greatest(1, floor(coalesce(nullif(elem->>'quantity', ''), nullif(elem->>'qty', ''), '1')::numeric)::integer);

    if v_product_id is null then
      raise exception 'Each line needs a product id.';
    end if;

    select * into prod
    from public.products
    where product_id = v_product_id
    for update;

    if not found then
      raise exception 'Product % was not found.', v_product_id;
    end if;
    if coalesce(prod.product_status, '') <> 'Active' then
      raise exception '"%" is not available.', prod.name;
    end if;
    if coalesce(prod.stock_status, '') = 'Out of stock' or coalesce(prod.available_quantity, 0) < v_qty then
      raise exception '"%" does not have enough stock.', prod.name;
    end if;

    v_unit := round(coalesce(prod.selling_price, 0)::numeric, 2);
    v_line := round(v_unit * v_qty, 2);
    v_subtotal := v_subtotal + v_line;
    lines_count := lines_count + 1;
  end loop;

  if lines_count = 0 then
    raise exception 'Add at least one product to the order.';
  end if;

  v_total := v_subtotal;

  insert into public.orders (
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    shipping_address,
    status,
    payment_status,
    payment_method,
    subtotal,
    discount_total,
    total,
    notes,
    stock_deducted
  )
  values (
    auth.uid(),
    v_name,
    v_phone,
    v_email,
    v_address,
    'Pending',
    'Unpaid',
    'cod',
    v_subtotal,
    0,
    v_total,
    '',
    false
  )
  returning order_id into v_order_id;

  for elem in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := coalesce(
      nullif(elem->>'productId', '')::bigint,
      nullif(elem->>'product_id', '')::bigint
    );
    v_qty := greatest(1, floor(coalesce(nullif(elem->>'quantity', ''), nullif(elem->>'qty', ''), '1')::numeric)::integer);

    select * into prod from public.products where product_id = v_product_id;
    v_unit := round(coalesce(prod.selling_price, 0)::numeric, 2);
    v_line := round(v_unit * v_qty, 2);

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      line_total
    )
    values (
      v_order_id,
      v_product_id,
      coalesce(prod.name, ''),
      v_unit,
      v_qty,
      v_line
    )
    on conflict (order_id, product_id) do update
      set
        quantity = public.order_items.quantity + excluded.quantity,
        unit_price = excluded.unit_price,
        product_name = excluded.product_name,
        line_total = round(
          (public.order_items.quantity + excluded.quantity) * excluded.unit_price,
          2
        );
  end loop;

  select
    coalesce(sum(line_total), 0),
    coalesce(sum(line_total), 0)
  into v_subtotal, v_total
  from public.order_items
  where order_id = v_order_id;

  update public.orders
  set
    subtotal = v_subtotal,
    total = v_total,
    updated_at = now()
  where order_id = v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.place_customer_order(jsonb, jsonb) from public;
grant execute on function public.place_customer_order(jsonb, jsonb) to anon, authenticated;
