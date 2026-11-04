-- Copy to SQL Editor, replace YOUR_RAZORPAY_KEY_SECRET with the value of
-- RAZORPAY_KEY_SECRET from customer/.env, then run once.

create schema if not exists private;

create table if not exists private.payment_secrets (
  name text primary key,
  value text not null
);

insert into private.payment_secrets (name, value)
values ('razorpay_key_secret', 'YOUR_RAZORPAY_KEY_SECRET')
on conflict (name) do update
set value = excluded.value;
