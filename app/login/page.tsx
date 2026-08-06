'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { isFirebaseEnabled } from '@/lib/firebase';

export default function LoginPage() {
  const { user, loading, login, signup, loginWithGoogle } = useAuth();
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await loginWithGoogle();
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google-Anmeldung fehlgeschlagen.');
    } finally {
      setGoogleSubmitting(false);
    }
  }

  if (!isFirebaseEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-neutral-500">
        Firebase ist noch nicht konfiguriert. Bitte NEXT_PUBLIC_FIREBASE_* Umgebungsvariablen setzen.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold">my-pain</h1>
        <p className="mb-8 text-sm text-neutral-500">Training & Schmerz-Tracking</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">E-Mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Passwort</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white disabled:opacity-50"
          >
            {mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs text-neutral-400">oder</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-base font-medium disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.12C3.25 21.3 7.31 24 12 24Z" />
            <path fill="#FBBC05" d="M5.27 14.27a7.24 7.24 0 0 1 0-4.54V6.61H1.27a12 12 0 0 0 0 10.78l4-3.12Z" />
            <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.61l4 3.12C6.22 6.88 8.87 4.77 12 4.77Z" />
          </svg>
          Mit Google anmelden
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
          }}
          className="mt-6 w-full text-center text-sm text-neutral-500 underline"
        >
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Bereits registriert? Anmelden'}
        </button>
      </div>
    </div>
  );
}
