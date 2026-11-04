import { supabase } from './config';

/**
 * Soft-fail order notifications (email / SMS / WhatsApp via Edge Function).
 * Admin status changes must not block if messaging fails.
 */
export async function notifyOrder(orderId, event) {
  const id = Number(orderId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const kind = String(event || '').toLowerCase().trim();
  if (!kind) return null;

  try {
    const { data, error } = await supabase.functions.invoke('notify-order', {
      body: { orderId: id, event: kind },
    });
    if (error) {
      console.warn('[notifyOrder]', error.message || error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[notifyOrder]', err?.message || err);
    return null;
  }
}
