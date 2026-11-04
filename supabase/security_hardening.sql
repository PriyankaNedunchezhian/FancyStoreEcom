-- Security hardening. Run once in the Supabase SQL Editor after razorpay_orders.sql.
-- 1) Payment RPCs require the signed-in owner or an admin.
-- 2) Finalize requires the stored Razorpay order id (blocks payment-amount swap).
-- 3) Checkout payload limits.
-- 4) Demo seed RPCs are admin-only.

create or replace function public.get_razorpay_payment_session(p_order_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.orders;
begin
  if p_order_id is null then
    raise exception 'Order id is required.';
  end if;
  if auth.uid() is null then
    raise exception 'Sign in to continue payment.';
  end if;

  select * into ord
  from public.orders
  where order_id = p_order_id;

  if not found then
    raise exception 'Order not found.';
  end if;
  if not public.is_admin() and ord.customer_id is distinct from auth.uid() then
    raise exception 'You can only pay for your own orders.';
  end if;
  if ord.payment_method is distinct from 'razorpay' then
    raise exception 'This order is not set up for Razorpay.';
  end if;
  if ord.payment_status = 'Paid' then
    raise exception 'This order is already paid.';
  end if;
  if ord.payment_status is distinct from 'Unpaid' then
    raise exception 'This order cannot accept online payment.';
  end if;

  return jsonb_build_object(
    'orderId', ord.order_id,
    'total', ord.total,
    'name', ord.customer_name,
    'email', ord.customer_email,
    'phone', ord.customer_phone,
    'razorpayOrderId', coalesce(ord.razorpay_order_id, '')
  );
end;
$$;

create or replace function public.attach_razorpay_order_id(
  p_order_id bigint,
  p_razorpay_order_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.orders;
  v_rzp text;
begin
  v_rzp := trim(coalesce(p_razorpay_order_id, ''));
  if p_order_id is null or v_rzp = '' then
    raise exception 'Order id and Razorpay order id are required.';
  end if;
  if auth.uid() is null then
    raise exception 'Sign in to continue payment.';
  end if;

  select * into ord
  from public.orders
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;
  if not public.is_admin() and ord.customer_id is distinct from auth.uid() then
    raise exception 'You can only pay for your own orders.';
  end if;
  if ord.payment_method is distinct from 'razorpay' then
    raise exception 'This order is not set up for Razorpay.';
  end if;
  if ord.payment_status is distinct from 'Unpaid' then
    raise exception 'This order cannot accept online payment.';
  end if;
  if coalesce(ord.razorpay_order_id, '') <> '' and ord.razorpay_order_id is distinct from v_rzp then
    raise exception 'Razorpay order is already attached.';
  end if;

  update public.orders
  set razorpay_order_id = v_rzp, updated_at = now()
  where order_id = p_order_id;
end;
$$;

create or replace function public.finalize_razorpay_payment(
  p_order_id bigint,
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_razorpay_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  ord public.orders;
  v_secret text;
  v_expected text;
  v_rzp_order text;
  v_rzp_payment text;
  v_signature text;
begin
  v_rzp_order := trim(coalesce(p_razorpay_order_id, ''));
  v_rzp_payment := trim(coalesce(p_razorpay_payment_id, ''));
  v_signature := trim(coalesce(p_razorpay_signature, ''));

  if p_order_id is null or v_rzp_order = '' or v_rzp_payment = '' or v_signature = '' then
    raise exception 'Missing Razorpay payment details.';
  end if;
  if auth.uid() is null then
    raise exception 'Sign in to verify payment.';
  end if;

  select value into v_secret
  from private.payment_secrets
  where name = 'razorpay_key_secret';

  if coalesce(v_secret, '') = '' then
    raise exception 'Razorpay secret is not configured in the database.';
  end if;

  v_expected := encode(
    hmac(
      convert_to(v_rzp_order || '|' || v_rzp_payment, 'UTF8'),
      convert_to(v_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  if v_expected is distinct from v_signature then
    raise exception 'Invalid payment signature.';
  end if;

  select * into ord
  from public.orders
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;
  if not public.is_admin() and ord.customer_id is distinct from auth.uid() then
    raise exception 'You can only verify payment for your own orders.';
  end if;
  if ord.payment_method is distinct from 'razorpay' then
    raise exception 'This order is not set up for Razorpay.';
  end if;
  if coalesce(ord.razorpay_order_id, '') = '' then
    raise exception 'Start payment before verifying.';
  end if;
  if ord.razorpay_order_id is distinct from v_rzp_order then
    raise exception 'Razorpay order does not match this store order.';
  end if;
  if ord.payment_status = 'Paid' then
    return jsonb_build_object(
      'ok', true,
      'orderId', ord.order_id,
      'paymentStatus', 'Paid',
      'alreadyPaid', true
    );
  end if;

  update public.orders
  set
    payment_status = 'Paid',
    razorpay_order_id = v_rzp_order,
    razorpay_payment_id = v_rzp_payment,
    updated_at = now()
  where order_id = p_order_id
    and payment_status = 'Unpaid';

  return jsonb_build_object(
    'ok', true,
    'orderId', p_order_id,
    'paymentStatus', 'Paid',
    'alreadyPaid', false
  );
end;
$$;

revoke all on function public.get_razorpay_payment_session(bigint) from public, anon;
revoke all on function public.attach_razorpay_order_id(bigint, text) from public, anon;
revoke all on function public.finalize_razorpay_payment(bigint, text, text, text) from public, anon;
grant execute on function public.get_razorpay_payment_session(bigint) to authenticated;
grant execute on function public.attach_razorpay_order_id(bigint, text) to authenticated;
grant execute on function public.finalize_razorpay_payment(bigint, text, text, text) to authenticated;

-- Checkout payload limits (preserve existing pricing rules).
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
  c_free_shipping_min numeric(12, 2) := 999;
  c_shipping_fee numeric(12, 2) := 79;
begin
  v_name := left(trim(coalesce(p_customer->>'name', '')), 120);
  v_phone := left(trim(coalesce(p_customer->>'phone', '')), 30);
  v_email := left(trim(coalesce(p_customer->>'email', '')), 254);
  v_address := left(trim(coalesce(p_customer->>'address', '')), 500);
  v_method := lower(trim(coalesce(p_customer->>'payment_method', 'cod')));

  if v_name = '' then raise exception 'Full name is required.'; end if;
  if v_phone = '' then raise exception 'Phone is required.'; end if;
  if v_address = '' then raise exception 'Shipping address is required.'; end if;
  if v_method not in ('cod', 'razorpay') then
    raise exception 'Unsupported payment method.';
  end if;
  if v_method = 'razorpay' then
    if auth.uid() is null then
      raise exception 'Sign in to pay online.';
    end if;
    if v_email = '' then
      raise exception 'Email is required for online payment.';
    end if;
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one product to the order.';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'An order can contain at most 20 products.';
  end if;

  for elem in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(elem->>'productId', '')::bigint;
    if v_product_id is null then
      v_product_id := nullif(elem->>'product_id', '')::bigint;
    end if;
    v_qty := greatest(1, floor(coalesce(nullif(elem->>'quantity', ''), nullif(elem->>'qty', ''), '1')::numeric)::integer);
    if v_qty > 20 then
      raise exception 'Quantity per product cannot exceed 20.';
    end if;
    if v_product_id is null then
      raise exception 'Each line needs a product id.';
    end if;

    select * into prod from public.products where product_id = v_product_id for update;
    if not found then raise exception 'Product % was not found.', v_product_id; end if;
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

  if lines_count = 0 then raise exception 'Add at least one product to the order.'; end if;

  v_discount := 0;
  v_shipping := case when v_subtotal >= c_free_shipping_min then 0 else c_shipping_fee end;
  v_total := greatest(v_subtotal - v_discount, 0) + v_shipping;

  insert into public.orders (
    customer_id, customer_name, customer_phone, customer_email, shipping_address,
    status, payment_status, payment_method, subtotal, discount_total, shipping_total, total, notes, stock_deducted
  ) values (
    auth.uid(), v_name, v_phone, v_email, v_address,
    'Pending', 'Unpaid', v_method, v_subtotal, v_discount, v_shipping, v_total, '', false
  ) returning order_id into v_order_id;

  for elem in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := coalesce(nullif(elem->>'productId', '')::bigint, nullif(elem->>'product_id', '')::bigint);
    v_qty := greatest(1, floor(coalesce(nullif(elem->>'quantity', ''), nullif(elem->>'qty', ''), '1')::numeric)::integer);
    if v_qty > 20 then v_qty := 20; end if;
    select * into prod from public.products where product_id = v_product_id;
    v_unit := round(coalesce(prod.selling_price, 0)::numeric, 2);
    v_line := round(v_unit * v_qty, 2);

    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
    values (v_order_id, v_product_id, coalesce(prod.name, ''), v_unit, v_qty, v_line)
    on conflict (order_id, product_id) do update
      set quantity = public.order_items.quantity + excluded.quantity,
          unit_price = excluded.unit_price,
          product_name = excluded.product_name,
          line_total = round((public.order_items.quantity + excluded.quantity) * excluded.unit_price, 2);
  end loop;

  select coalesce(sum(line_total), 0) into v_subtotal from public.order_items where order_id = v_order_id;
  v_discount := 0;
  v_shipping := case when v_subtotal >= c_free_shipping_min then 0 else c_shipping_fee end;
  v_total := greatest(v_subtotal - v_discount, 0) + v_shipping;

  update public.orders
  set subtotal = v_subtotal, discount_total = v_discount, shipping_total = v_shipping, total = v_total, updated_at = now()
  where order_id = v_order_id;

  return v_order_id;
end;
$$;

-- Re-run seed_orders.sql and seed_wishlists.sql after this file.
-- Those seeders now refuse non-admin callers.
