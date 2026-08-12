'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getExercises, getUserExercises, createUserWorkout } from '@/lib/data';
import { Category, CATEGORY_LABELS, Exercise } from '@/lib/types';

const CATEGORIES: Category[] = ['oberkoerper', 'unterkoerper', 'ganzkoerper', 'warmup'];

function BuilderInner() {
  const { user } = useAuth();
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [ownExerciseIds, setOwnExerciseIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<Category>('oberkoerper');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getExercises(), getUserExercises(user.uid)])
      .then(([global, own]) => {
        setExercises([...global, ...own]);
        setOwnExerciseIds(new Set(own.map((ex) => ex.id)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, [user]);

  function toggleExercise(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function moveSelected(id: string, direction: 'up' | 'down') {
    setSelected((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    if (!user || !name.trim() || selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await createUserWorkout(user.uid, {
        name: name.trim(),
        category,
        exerciseIds: selected,
        createdAt: Date.now(),
      });
      router.replace('/training');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  const visibleExercises = exercises.filter((e) => e.category === category);

  return (
    <AppShell title="Training erstellen">
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Mein Oberkörper-Training"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
        />
      </div>

      <div className="mb-4 flex gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);
              setSelected([]);
            }}
            className={clsx(
              'flex-1 rounded-full px-3 py-1.5 text-sm',
              category === c ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
            )}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <Link
        href="/exercises/new"
        className="mb-4 block rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-center text-sm font-medium text-neutral-600"
      >
        + Eigene Übung anlegen
      </Link>

      {selected.length > 0 && (
        <div className="mb-4">
          <p className="mb-1 text-sm font-medium">Ausgewählte Übungen (Reihenfolge)</p>
          <div className="space-y-2">
            {selected.map((id, i) => {
              const ex = exercises.find((e) => e.id === id);
              return (
                <div key={id} className="flex items-center gap-2 rounded-lg border border-neutral-900 bg-neutral-50 px-4 py-2">
                  <span className="flex-1 text-sm">{ex?.name ?? id}</span>
                  <button
                    onClick={() => moveSelected(id, 'up')}
                    disabled={i === 0}
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveSelected(id, 'down')}
                    disabled={i === selected.length - 1}
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => toggleExercise(id)}
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-red-600"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-24 space-y-2">
        {visibleExercises.map((ex) => (
          <div key={ex.id} className="flex items-center gap-2">
            <button
              onClick={() => toggleExercise(ex.id)}
              className={clsx(
                'flex flex-1 items-center justify-between rounded-lg border px-4 py-3 text-left',
                selected.includes(ex.id) ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
              )}
            >
              <span>{ex.name}</span>
              {selected.includes(ex.id) && <span className="text-sm">✓</span>}
            </button>
            {ownExerciseIds.has(ex.id) && (
              <Link
                href={`/exercises/${ex.id}/edit`}
                className="rounded-lg border border-neutral-200 px-3 py-3 text-sm"
                title="Übung bearbeiten"
              >
                ✎
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-16 border-t border-neutral-200 bg-white p-4">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || selected.length === 0}
          className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Speichert…' : `Training speichern (${selected.length} Übungen)`}
        </button>
      </div>
    </AppShell>
  );
}

export default function BuilderPage() {
  return (
    <RequireAuth>
      <BuilderInner />
    </RequireAuth>
  );
}
