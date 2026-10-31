-- Customer checkout: run once in Supabase SQL Editor after schema.sql.
-- Place order RPC (guest or signed-in) + payment_method + customer read of own orders.

alter table public.orders
  add column if not exists payment_method text not null default 'cod';

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('cod', 'razorpay', 'stripe'));

create index if not exists orders_customer_id_idx on public.orders (customer_id);

-- Customer own-order read. Admin CRUD is defined in admin_roles.sql / schema.sql via is_admin().
drop policy if exists "Customers can read own orders" on public.orders;
create policy "Customers can read own orders"
  on public.orders for select
  to authenticated
  using (customer_id = auth.uid());

drop policy if exists "Customers can read own order items" on public.order_items;
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

  -- Soft-validate and total from DB prices
  for elem in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(elem->>'productId', '')::bigint;
    if v_product_id is null then
      v_product_id := nullif(elem->>'product_id', '')::bigint;
    end if;
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

  -- Recompute totals after merge collisions
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
