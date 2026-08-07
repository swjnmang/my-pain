'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
  signOut,
} from 'firebase/auth';
import { auth, isFirebaseEnabled } from './firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string, currentPassword: string) => Promise<void>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseEnabled || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    if (!auth) throw new Error('Firebase ist nicht konfiguriert.');
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signup(email: string, password: string) {
    if (!auth) throw new Error('Firebase ist nicht konfiguriert.');
    await createUserWithEmailAndPassword(auth, email, password);
  }

  async function loginWithGoogle() {
    if (!auth) throw new Error('Firebase ist nicht konfiguriert.');
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async function logout() {
    if (!auth) return;
    await signOut(auth);
  }

  async function changePassword(newPassword: string, currentPassword: string) {
    if (!auth?.currentUser?.email) throw new Error('Nicht angemeldet.');
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
  }

  async function changeEmail(newEmail: string, currentPassword: string) {
    if (!auth?.currentUser?.email) throw new Error('Nicht angemeldet.');
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    // Ändert die E-Mail erst, nachdem der Link in der Bestätigungsmail an die neue Adresse angeklickt wurde.
    await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, loginWithGoogle, logout, changePassword, changeEmail }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden.');
  return ctx;
}
