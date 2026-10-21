-- Fancy Store — sample wishlist data for admin testing
-- Prerequisites: run schema.sql first, and have at least 1 product in public.products.
-- Run this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Fixed demo customer accounts (idempotent)
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

-- Re-runnable seeder: links demo customers to existing products
create or replace function public.seed_wishlist_demo()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  product_ids bigint[];
  n integer;
  total integer;
begin
  select coalesce(array_agg(product_id order by product_id), '{}')
  into product_ids
  from (
    select product_id
    from public.products
    order by product_id
    limit 6
  ) p;

  n := coalesce(cardinality(product_ids), 0);
  if n = 0 then
    raise exception 'No products found. Add catalog products first, then re-run seed.';
  end if;

  -- Customer 1: first up to 4 products
  insert into public.wishlists (customer_id, product_id)
  select
    '11111111-1111-4111-8111-111111111111'::uuid,
    product_ids[i]
  from generate_series(1, least(n, 4)) as g(i)
  on conflict (customer_id, product_id) do nothing;

  -- Customer 2: first up to 3 products (overlaps → higher counts)
  insert into public.wishlists (customer_id, product_id)
  select
    '22222222-2222-4222-8222-222222222222'::uuid,
    product_ids[i]
  from generate_series(1, least(n, 3)) as g(i)
  on conflict (customer_id, product_id) do nothing;

  -- Customer 3: first product only (most popular)
  insert into public.wishlists (customer_id, product_id)
  values (
    '33333333-3333-4333-8333-333333333333'::uuid,
    product_ids[1]
  )
  on conflict (customer_id, product_id) do nothing;

  select count(*)::integer
  into total
  from public.wishlists
  where customer_id in (
    '11111111-1111-4111-8111-111111111111'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid
  );

  return total;
end;
$$;

revoke all on function public.seed_wishlist_demo() from public;
grant execute on function public.seed_wishlist_demo() to authenticated;

select public.seed_wishlist_demo() as wishlist_rows_for_demo_customers;
