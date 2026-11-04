export const MIN_PASSWORD_LENGTH = 8;

export function passwordPolicyError(password) {
  const value = String(password || '');
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Password must include letters and numbers.';
  }
  return '';
}
