import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { auth } from './config';

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export function logout() {
  return signOut(auth);
}

export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('No authenticated user.');
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
