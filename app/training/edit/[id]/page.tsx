'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getExercises, getUserExercises, getUserWorkout, updateUserWorkout } from '@/lib/data';
import { Category, CATEGORY_LABELS, Exercise } from '@/lib/types';

const CATEGORIES: Category[] = ['oberkoerper', 'unterkoerper', 'ganzkoerper', 'warmup'];

function EditWorkoutInner() {
  const { user } = useAuth();
  const router = useRouter();
  const routeParams = useParams();
  const workoutId = routeParams.id as string;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [ownExerciseIds, setOwnExerciseIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<Category>('oberkoerper');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !workoutId) return;
    Promise.all([getExercises(), getUserExercises(user.uid), getUserWorkout(user.uid, workoutId)])
      .then(([global, own, workout]) => {
        setExercises([...global, ...own]);
        setOwnExerciseIds(new Set(own.map((ex) => ex.id)));
        if (!workout) {
          setError('Training nicht gefunden.');
          return;
        }
        setName(workout.name);
        setCategory(workout.category);
        setSelected(new Set(workout.exerciseIds));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, [user, workoutId]);

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
      await updateUserWorkout(user.uid, workoutId, {
        name: name.trim(),
        category,
        exerciseIds: Array.from(selected),
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
    <AppShell title="Training bearbeiten">
      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}

      {!loading && (
        <>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

          <div className="mb-24 space-y-2">
            {visibleExercises.map((ex) => (
              <div key={ex.id} className="flex items-center gap-2">
                <button
                  onClick={() => toggleExercise(ex.id)}
                  className={clsx(
                    'flex flex-1 items-center justify-between rounded-lg border px-4 py-3 text-left',
                    selected.has(ex.id) ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
                  )}
                >
                  <span>{ex.name}</span>
                  {selected.has(ex.id) && <span className="text-sm">✓</span>}
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
              disabled={saving || !name.trim() || selected.size === 0}
              className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Speichert…' : `Änderungen speichern (${selected.size} Übungen)`}
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}

export default function EditWorkoutPage() {
  return (
    <RequireAuth>
      <EditWorkoutInner />
    </RequireAuth>
  );
}
