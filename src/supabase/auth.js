import { supabase } from './config';
import { isAdminUser } from './roles';

function asAuthError(error, fallbackCode = 'auth/unknown') {
  const err = new Error(error?.message || 'Authentication failed.');
  err.code = error?.code || fallbackCode;
  err.status = error?.status;
  throw err;
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) asAuthError(error, 'invalid_credentials');

  if (!isAdminUser(data.user)) {
    await supabase.auth.signOut();
    asAuthError(
      { message: 'Admin access only. This account is not an admin.', code: 'not_admin' },
      'not_admin',
    );
  }

  return data;
}

export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  });
  if (error) asAuthError(error, 'reset_failed');
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) asAuthError(error, 'logout_failed');
}

export async function changePassword(currentPassword, newPassword) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    asAuthError(userError || { message: 'No authenticated user.' }, 'no_user');
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (reauthError) {
    asAuthError(reauthError, 'invalid_credentials');
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    asAuthError(updateError, 'update_failed');
  }
}
