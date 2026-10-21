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

drop policy if exists "Authenticated users can read products" on public.products;
drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Authenticated users can update products" on public.products;
drop policy if exists "Authenticated users can delete products" on public.products;

create policy "Authenticated users can read products"
  on public.products for select
  to authenticated
  using (true);

create policy "Authenticated users can insert products"
  on public.products for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update products"
  on public.products for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete products"
  on public.products for delete
  to authenticated
  using (true);

-- Storage bucket for product images (also create via Dashboard → Storage if preferred)
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

drop policy if exists "Authenticated users can upload product images" on storage.objects;
drop policy if exists "Authenticated users can update product images" on storage.objects;
drop policy if exists "Authenticated users can delete product images" on storage.objects;
drop policy if exists "Public can read product images" on storage.objects;

create policy "Authenticated users can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'products');

create policy "Authenticated users can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'products');

create policy "Authenticated users can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'products');

create policy "Public can read product images"
  on storage.objects for select
  to public
  using (bucket_id = 'products');
