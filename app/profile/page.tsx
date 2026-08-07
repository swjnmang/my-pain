'use client';

import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import ProgressCharts from '@/components/ProgressCharts';
import { useAuth } from '@/lib/AuthContext';
import { getUserProfile, updateUserProfile } from '@/lib/data';

function ProfileInner() {
  const { user, changePassword, changeEmail } = useAuth();
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPasswordForPw, setCurrentPasswordForPw] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const hasPasswordProvider = user?.providerData.some((p) => p.providerId === 'password') ?? false;

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid)
      .then((profile) => {
        if (profile?.heightCm) setHeightCm(String(profile.heightCm));
        if (profile?.weightKg) setWeightKg(String(profile.weightKg));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      await updateUserProfile(user.uid, {
        ...(heightCm ? { heightCm: Number(heightCm) } : {}),
        ...(weightKg ? { weightKg: Number(weightKg) } : {}),
      });
      setSavedMessage('Gespeichert.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPwSaving(true);
    setPwError(null);
    setPwMessage(null);
    try {
      await changePassword(newPassword, currentPasswordForPw);
      setNewPassword('');
      setCurrentPasswordForPw('');
      setPwMessage('Passwort geändert.');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Passwort ändern fehlgeschlagen.');
    } finally {
      setPwSaving(false);
    }
  }

  async function handleChangeEmail() {
    setEmailSaving(true);
    setEmailError(null);
    setEmailMessage(null);
    try {
      await changeEmail(newEmail, currentPasswordForEmail);
      setNewEmail('');
      setCurrentPasswordForEmail('');
      setEmailMessage('Bestätigungslink an die neue Adresse gesendet. Die Änderung wird wirksam, sobald du ihn anklickst.');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'E-Mail ändern fehlgeschlagen.');
    } finally {
      setEmailSaving(false);
    }
  }

  return (
    <AppShell title="Profil">
      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}

      {!loading && (
        <div className="space-y-8 pb-8">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-neutral-500">Körperdaten</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Körpergröße (cm)</label>
                <input
                  type="number"
                  min={0}
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Gewicht (kg)</label>
                <input
                  type="number"
                  min={0}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {savedMessage && <p className="text-sm text-green-700">{savedMessage}</p>}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Speichert…' : 'Speichern'}
              </button>
            </div>
          </section>

          <details className="rounded-lg border border-neutral-200 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-neutral-500">
              Verlauf & Fortschritt
            </summary>
            <div className="mt-4">
              <ProgressCharts />
            </div>
          </details>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-neutral-500">Konto</h2>

            {!hasPasswordProvider && (
              <p className="text-sm text-neutral-400">
                Du bist über Google angemeldet — E-Mail und Passwort werden über dein Google-Konto
                verwaltet.
              </p>
            )}

            {hasPasswordProvider && (
              <div className="space-y-6">
                <div className="space-y-2 rounded-lg border border-neutral-200 p-4">
                  <p className="text-sm font-medium">Passwort ändern</p>
                  <input
                    type="password"
                    placeholder="Aktuelles Passwort"
                    value={currentPasswordForPw}
                    onChange={(e) => setCurrentPasswordForPw(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
                  />
                  <input
                    type="password"
                    placeholder="Neues Passwort"
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
                  />
                  {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                  {pwMessage && <p className="text-sm text-green-700">{pwMessage}</p>}
                  <button
                    onClick={handleChangePassword}
                    disabled={pwSaving || !currentPasswordForPw || newPassword.length < 6}
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {pwSaving ? 'Speichert…' : 'Passwort ändern'}
                  </button>
                </div>

                <div className="space-y-2 rounded-lg border border-neutral-200 p-4">
                  <p className="text-sm font-medium">E-Mail-Adresse ändern</p>
                  <input
                    type="password"
                    placeholder="Aktuelles Passwort"
                    value={currentPasswordForEmail}
                    onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
                  />
                  <input
                    type="email"
                    placeholder="Neue E-Mail-Adresse"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
                  />
                  {emailError && <p className="text-sm text-red-600">{emailError}</p>}
                  {emailMessage && <p className="text-sm text-green-700">{emailMessage}</p>}
                  <button
                    onClick={handleChangeEmail}
                    disabled={emailSaving || !currentPasswordForEmail || !newEmail}
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {emailSaving ? 'Speichert…' : 'E-Mail ändern'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileInner />
    </RequireAuth>
  );
}
