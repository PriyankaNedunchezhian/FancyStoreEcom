export function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function discountPercent(mrp, sellingPrice) {
  const marked = Number(mrp);
  const selling = Number(sellingPrice);
  if (!Number.isFinite(marked) || marked <= 0 || !Number.isFinite(selling) || selling >= marked) {
    return 0;
  }
  return Math.round(((marked - selling) / marked) * 100);
}
