-- Fancy Store — sample orders for admin testing
-- Prerequisites: schema.sql (orders + order_items), at least 2 products.
-- Demo customers match seed_wishlists.sql UUIDs when present.

create extension if not exists pgcrypto;

do $$
declare
  demo record;
  inst uuid;
begin
  select instance_id into inst from auth.users limit 1;
  if inst is null then
    inst := '00000000-0000-0000-0000-000000000000';
  end if;

  for demo in
    select *
    from (
      values
        (
          '11111111-1111-4111-8111-111111111111'::uuid,
          'demo.customer1@fancystore.test',
          'Demo Customer 1'
        ),
        (
          '22222222-2222-4222-8222-222222222222'::uuid,
          'demo.customer2@fancystore.test',
          'Demo Customer 2'
        ),
        (
          '33333333-3333-4333-8333-333333333333'::uuid,
          'demo.customer3@fancystore.test',
          'Demo Customer 3'
        )
    ) as t(id, email, full_name)
  loop
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      inst,
      demo.id,
      'authenticated',
      'authenticated',
      demo.email,
      crypt('DemoPass123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', demo.full_name),
      false,
      '',
      '',
      '',
      ''
    )
    on conflict (id) do nothing;

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      demo.id,
      demo.id,
      jsonb_build_object(
        'sub', demo.id::text,
        'email', demo.email,
        'email_verified', true
      ),
      'email',
      demo.id::text,
      now(),
      now(),
      now()
    )
    on conflict do nothing;
  end loop;
end $$;

create or replace function public.seed_orders_demo()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  p1 bigint;
  p2 bigint;
  p3 bigint;
  price1 numeric(12, 2);
  price2 numeric(12, 2);
  price3 numeric(12, 2);
  name1 text;
  name2 text;
  name3 text;
  oid bigint;
  total_count integer;
begin
  select product_id, selling_price, name
  into p1, price1, name1
  from public.products
  order by product_id
  limit 1;

  if p1 is null then
    raise exception 'No products found. Add catalog products first, then re-run seed.';
  end if;

  select product_id, selling_price, name
  into p2, price2, name2
  from public.products
  order by product_id
  offset 1
  limit 1;

  select product_id, selling_price, name
  into p3, price3, name3
  from public.products
  order by product_id
  offset 2
  limit 1;

  if p2 is null then
    p2 := p1;
    price2 := price1;
    name2 := name1;
  end if;
  if p3 is null then
    p3 := p1;
    price3 := price1;
    name3 := name1;
  end if;

  -- Clear previous demo orders (notes marker)
  delete from public.orders
  where notes like '[demo]%';

  -- 1 Pending
  insert into public.orders (
    customer_id, customer_name, customer_phone, customer_email,
    shipping_address, status, payment_status,
    subtotal, discount_total, total, notes, stock_deducted
  ) values (
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Demo Customer 1',
    '9876500001',
    'demo.customer1@fancystore.test',
    '12 MG Road, Bengaluru',
    'Pending',
    'Unpaid',
    price1,
    0,
    price1,
    '[demo] Pending jewellery order',
    false
  ) returning order_id into oid;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
  values (oid, p1, name1, price1, 1, price1);

  -- 2 Confirmed (stock already marked deducted for demo; do not double-deduct live stock)
  insert into public.orders (
    customer_id, customer_name, customer_phone, customer_email,
    shipping_address, status, payment_status,
    subtotal, discount_total, total, notes, stock_deducted
  ) values (
    '22222222-2222-4222-8222-222222222222'::uuid,
    'Demo Customer 2',
    '9876500002',
    'demo.customer2@fancystore.test',
    '45 Anna Salai, Chennai',
    'Confirmed',
    'Paid',
    price1 + price2,
    50,
    greatest(price1 + price2 - 50, 0),
    '[demo] Confirmed multi-item order',
    true
  ) returning order_id into oid;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
  values
    (oid, p1, name1, price1, 1, price1),
    (oid, p2, name2, price2, 1, price2);

  -- 3 Shipped
  insert into public.orders (
    customer_id, customer_name, customer_phone, customer_email,
    shipping_address, status, payment_status,
    subtotal, discount_total, total, notes, stock_deducted
  ) values (
    '33333333-3333-4333-8333-333333333333'::uuid,
    'Demo Customer 3',
    '9876500003',
    'demo.customer3@fancystore.test',
    '78 Park Street, Kolkata',
    'Shipped',
    'Paid',
    price2 * 2,
    0,
    price2 * 2,
    '[demo] Shipped order',
    true
  ) returning order_id into oid;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
  values (oid, p2, name2, price2, 2, price2 * 2);

  -- 4 Delivered
  insert into public.orders (
    customer_id, customer_name, customer_phone, customer_email,
    shipping_address, status, payment_status,
    subtotal, discount_total, total, notes, stock_deducted
  ) values (
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Demo Customer 1',
    '9876500001',
    'demo.customer1@fancystore.test',
    '12 MG Road, Bengaluru',
    'Delivered',
    'Paid',
    price3,
    0,
    price3,
    '[demo] Delivered order',
    true
  ) returning order_id into oid;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
  values (oid, p3, name3, price3, 1, price3);

  -- 5 Cancelled (no stock deducted)
  insert into public.orders (
    customer_id, customer_name, customer_phone, customer_email,
    shipping_address, status, payment_status,
    subtotal, discount_total, total, notes, stock_deducted
  ) values (
    '22222222-2222-4222-8222-222222222222'::uuid,
    'Demo Customer 2',
    '9876500002',
    'demo.customer2@fancystore.test',
    '45 Anna Salai, Chennai',
    'Cancelled',
    'Refunded',
    price1,
    0,
    price1,
    '[demo] Cancelled before confirm',
    false
  ) returning order_id into oid;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
  values (oid, p1, name1, price1, 1, price1);

  select count(*)::integer into total_count
  from public.orders
  where notes like '[demo]%';

  return total_count;
end;
$$;

revoke all on function public.seed_orders_demo() from public;
grant execute on function public.seed_orders_demo() to authenticated;

select public.seed_orders_demo() as demo_orders_created;
