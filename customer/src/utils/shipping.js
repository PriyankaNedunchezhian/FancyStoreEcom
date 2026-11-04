/** Keep in sync with place_customer_order in supabase/shipping_fees.sql */
export const FREE_SHIPPING_MIN = 999;
export const SHIPPING_FEE = 79;

export function getShippingTotal(subtotal) {
  const amount = Number(subtotal) || 0;
  return amount >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
}

export function getOrderTotal(subtotal, discountTotal = 0) {
  const sub = Number(subtotal) || 0;
  const discount = Math.max(0, Number(discountTotal) || 0);
  const shipping = getShippingTotal(sub);
  return Math.max(0, sub - discount) + shipping;
}
