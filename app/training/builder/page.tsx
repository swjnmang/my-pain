'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getExercises, createUserWorkout } from '@/lib/data';
import { Category, CATEGORY_LABELS, Exercise } from '@/lib/types';

const CATEGORIES: Category[] = ['oberkoerper', 'unterkoerper', 'ganzkoerper'];

function BuilderInner() {
  const { user } = useAuth();
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [category, setCategory] = useState<Category>('oberkoerper');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getExercises()
      .then(setExercises)
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, []);

  function toggleExercise(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!user || !name.trim() || selected.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      await createUserWorkout(user.uid, {
        name: name.trim(),
        category,
        exerciseIds: Array.from(selected),
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
              setSelected(new Set());
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

      <div className="mb-24 space-y-2">
        {visibleExercises.map((ex) => (
          <button
            key={ex.id}
            onClick={() => toggleExercise(ex.id)}
            className={clsx(
              'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left',
              selected.has(ex.id) ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
            )}
          >
            <span>{ex.name}</span>
            {selected.has(ex.id) && <span className="text-sm">✓</span>}
          </button>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-16 border-t border-neutral-200 bg-white p-4">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || selected.size === 0}
          className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Speichert…' : `Training speichern (${selected.size} Übungen)`}
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
