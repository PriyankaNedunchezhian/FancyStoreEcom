-- Customer self-cancel for Pending orders (own orders only).
-- Run in the Supabase SQL Editor after admin_roles / schema are applied.
-- Admin cancel remains cancel_order_restore_stock (Pending + Confirmed).

create or replace function public.cancel_my_order(p_order_id bigint)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  ord public.orders;
  item record;
  v_payment_status text;
begin
  if v_uid is null then
    raise exception 'Sign in to cancel your order.';
  end if;

  select * into ord
  from public.orders
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if ord.customer_id is distinct from v_uid then
    raise exception 'You can only cancel your own orders.';
  end if;

  if ord.status is distinct from 'Pending' then
    raise exception 'Only pending orders can be cancelled.';
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

  v_payment_status := ord.payment_status;
  if v_payment_status = 'Paid' then
    v_payment_status := 'Refunded';
  end if;

  update public.orders
  set
    status = 'Cancelled',
    payment_status = v_payment_status,
    stock_deducted = false,
    updated_at = now()
  where order_id = p_order_id
  returning * into ord;

  return ord;
end;
$$;

revoke all on function public.cancel_my_order(bigint) from public;
grant execute on function public.cancel_my_order(bigint) to authenticated;
