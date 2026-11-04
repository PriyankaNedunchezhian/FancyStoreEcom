-- Customer saved addresses: run once in Supabase SQL Editor after admin_roles.sql.
-- Profile name/phone stay in auth.users raw_user_meta_data; addresses live here.
-- Max 5 addresses per user; at most one is_default.

create table if not exists public.customer_addresses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default 'Home',
  recipient_name text not null default '',
  phone text not null default '',
  address text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_addresses_user_id_idx
  on public.customer_addresses (user_id);

create index if not exists customer_addresses_user_default_idx
  on public.customer_addresses (user_id, is_default)
  where is_default = true;

alter table public.customer_addresses enable row level security;

drop policy if exists "Customers can read own addresses" on public.customer_addresses;
drop policy if exists "Customers can insert own addresses" on public.customer_addresses;
drop policy if exists "Customers can update own addresses" on public.customer_addresses;
drop policy if exists "Customers can delete own addresses" on public.customer_addresses;

create policy "Customers can read own addresses"
  on public.customer_addresses for select
  to authenticated
  using (user_id = auth.uid());

create policy "Customers can insert own addresses"
  on public.customer_addresses for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Customers can update own addresses"
  on public.customer_addresses for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Customers can delete own addresses"
  on public.customer_addresses for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.customer_addresses_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'Addresses must belong to the signed-in user.';
  end if;

  if tg_op = 'INSERT' then
    select count(*)::integer into v_count
    from public.customer_addresses
    where user_id = new.user_id;
    if v_count >= 5 then
      raise exception 'You can save at most 5 addresses.';
    end if;
    if v_count = 0 then
      new.is_default := true;
    end if;
  end if;

  new.label := left(trim(coalesce(new.label, '')), 40);
  if new.label = '' then
    new.label := 'Home';
  end if;
  new.recipient_name := left(trim(coalesce(new.recipient_name, '')), 120);
  new.phone := left(trim(coalesce(new.phone, '')), 30);
  new.address := left(trim(coalesce(new.address, '')), 500);
  new.updated_at := now();

  if new.recipient_name = '' then
    raise exception 'Recipient name is required.';
  end if;
  if new.phone = '' then
    raise exception 'Phone is required.';
  end if;
  if new.address = '' then
    raise exception 'Address is required.';
  end if;

  return new;
end;
$$;

drop trigger if exists customer_addresses_before_write_trg on public.customer_addresses;
drop trigger if exists customer_addresses_enforce_limits_trg on public.customer_addresses;
drop trigger if exists customer_addresses_single_default_trg on public.customer_addresses;

create trigger customer_addresses_before_write_trg
  before insert or update on public.customer_addresses
  for each row
  execute function public.customer_addresses_before_write();

create or replace function public.customer_addresses_clear_other_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_default then
    update public.customer_addresses
    set is_default = false, updated_at = now()
    where user_id = new.user_id
      and id is distinct from new.id
      and is_default = true;
  end if;
  return new;
end;
$$;

drop trigger if exists customer_addresses_clear_other_defaults_trg on public.customer_addresses;
create trigger customer_addresses_clear_other_defaults_trg
  after insert or update of is_default on public.customer_addresses
  for each row
  when (new.is_default = true)
  execute function public.customer_addresses_clear_other_defaults();
