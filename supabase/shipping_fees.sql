-- Shipping fees: run once in Supabase SQL Editor after razorpay_orders.sql (or customer_orders.sql).
-- Flat ₹79 when merchandise subtotal < ₹999; free shipping at ₹999+.
-- Fee is computed only inside place_customer_order (never trust the client).

alter table public.orders
  add column if not exists shipping_total numeric(12, 2) not null default 0;

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
  v_discount numeric(12, 2) := 0;
  v_shipping numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  elem jsonb;
  v_product_id bigint;
  v_qty integer;
  prod public.products;
  v_unit numeric(12, 2);
  v_line numeric(12, 2);
  lines_count integer := 0;
  -- Constants: keep in sync with customer/src/utils/shipping.js
  c_free_shipping_min numeric(12, 2) := 999;
  c_shipping_fee numeric(12, 2) := 79;
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
  if v_method not in ('cod', 'razorpay') then
    raise exception 'Unsupported payment method.';
  end if;
  if v_method = 'razorpay' and v_email = '' then
    raise exception 'Email is required for online payment.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one product to the order.';
  end if;

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

  v_discount := 0;
  v_shipping := case
    when v_subtotal >= c_free_shipping_min then 0
    else c_shipping_fee
  end;
  v_total := greatest(v_subtotal - v_discount, 0) + v_shipping;

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
    shipping_total,
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
    v_method,
    v_subtotal,
    v_discount,
    v_shipping,
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

  select coalesce(sum(line_total), 0)
  into v_subtotal
  from public.order_items
  where order_id = v_order_id;

  v_discount := 0;
  v_shipping := case
    when v_subtotal >= c_free_shipping_min then 0
    else c_shipping_fee
  end;
  v_total := greatest(v_subtotal - v_discount, 0) + v_shipping;

  update public.orders
  set
    subtotal = v_subtotal,
    discount_total = v_discount,
    shipping_total = v_shipping,
    total = v_total,
    updated_at = now()
  where order_id = v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.place_customer_order(jsonb, jsonb) from public;
grant execute on function public.place_customer_order(jsonb, jsonb) to anon, authenticated;
