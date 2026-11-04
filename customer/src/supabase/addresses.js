import { supabase } from './config';

export const MAX_ADDRESSES = 5;

function throwIfError(error) {
  if (error) {
    const err = new Error(error.message || 'Could not complete the address request.');
    err.code = error.code || 'supabase_error';
    throw err;
  }
}

function mapAddress(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    userId: row.user_id,
    label: row.label ?? 'Home',
    recipientName: row.recipient_name ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

async function requireUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  throwIfError(error);
  if (!user) {
    const err = new Error('Sign in to manage addresses.');
    err.code = 'auth_required';
    throw err;
  }
  return user;
}

export async function listAddresses() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });

  throwIfError(error);
  return (data || []).map(mapAddress);
}

export async function createAddress({
  label,
  recipientName,
  phone,
  address,
  isDefault = false,
}) {
  const user = await requireUser();
  const { data, error } = await supabase
    .from('customer_addresses')
    .insert({
      user_id: user.id,
      label: String(label || '').trim() || 'Home',
      recipient_name: String(recipientName || '').trim(),
      phone: String(phone || '').trim(),
      address: String(address || '').trim(),
      is_default: Boolean(isDefault),
    })
    .select('*')
    .single();

  throwIfError(error);
  return mapAddress(data);
}

export async function updateAddress(id, fields = {}) {
  const user = await requireUser();
  const patch = { updated_at: new Date().toISOString() };

  if ('label' in fields) {
    patch.label = String(fields.label || '').trim() || 'Home';
  }
  if ('recipientName' in fields) {
    patch.recipient_name = String(fields.recipientName || '').trim();
  }
  if ('phone' in fields) {
    patch.phone = String(fields.phone || '').trim();
  }
  if ('address' in fields) {
    patch.address = String(fields.address || '').trim();
  }
  if ('isDefault' in fields) {
    patch.is_default = Boolean(fields.isDefault);
  }

  const { data, error } = await supabase
    .from('customer_addresses')
    .update(patch)
    .eq('id', Number(id))
    .eq('user_id', user.id)
    .select('*')
    .single();

  throwIfError(error);
  return mapAddress(data);
}

export async function deleteAddress(id) {
  const user = await requireUser();
  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', Number(id))
    .eq('user_id', user.id);

  throwIfError(error);
}

export async function setDefaultAddress(id) {
  return updateAddress(id, { isDefault: true });
}

export function defaultAddress(addresses) {
  const list = Array.isArray(addresses) ? addresses : [];
  return list.find((item) => item.isDefault) || list[0] || null;
}
