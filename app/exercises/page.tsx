'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getExercises, getUserExercises, forkExerciseToUserExercise } from '@/lib/data';
import { columnLabel } from '@/lib/columns';
import { Category, CATEGORY_LABELS, Exercise } from '@/lib/types';

const CATEGORIES: Category[] = ['oberkoerper', 'unterkoerper', 'ganzkoerper', 'warmup'];

function ExerciseListInner() {
  const { user } = useAuth();
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [ownExerciseIds, setOwnExerciseIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Category | 'alle'>('alle');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forkingId, setForkingId] = useState<string | null>(null);

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

  async function handleEditGlobal(ex: Exercise) {
    if (!user) return;
    setForkingId(ex.id);
    setError(null);
    try {
      const newId = await forkExerciseToUserExercise(user.uid, ex);
      router.push(`/exercises/${newId}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kopie konnte nicht erstellt werden.');
      setForkingId(null);
    }
  }

  const filteredOwn = exercises.filter((ex) => ownExerciseIds.has(ex.id) && (filter === 'alle' || ex.category === filter));
  const filteredGlobal = exercises.filter((ex) => !ownExerciseIds.has(ex.id) && (filter === 'alle' || ex.category === filter));

  return (
    <AppShell title="Übungen">
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {(['alle', ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={clsx(
              'whitespace-nowrap rounded-full px-3 py-1.5 text-sm',
              filter === c ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
            )}
          >
            {c === 'alle' ? 'Alle' : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <Link
        href="/exercises/new"
        className="mb-6 block rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-center text-sm font-medium text-neutral-600"
      >
        + Eigene Übung erstellen
      </Link>

      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {!loading && filteredOwn.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">Meine Übungen</h2>
          <div className="space-y-2">
            {filteredOwn.map((ex) => (
              <div key={ex.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-3">
                <div className="flex-1">
                  <p className="font-medium">{ex.name}</p>
                  <p className="text-sm text-neutral-500">
                    {CATEGORY_LABELS[ex.category]} · {ex.columns.map((c) => columnLabel(c)).join(', ')}
                  </p>
                </div>
                <Link
                  href={`/exercises/${ex.id}/edit`}
                  className="rounded-lg border border-neutral-200 px-3 py-3 text-sm"
                  title="Übung bearbeiten"
                >
                  ✎
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">Vorgefertigte Übungen</h2>
          <div className="space-y-2">
            {filteredGlobal.map((ex) => (
              <div key={ex.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-3">
                <div className="flex-1">
                  <p className="font-medium">{ex.name}</p>
                  <p className="text-sm text-neutral-500">
                    {CATEGORY_LABELS[ex.category]} · {ex.columns.map((c) => columnLabel(c)).join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => handleEditGlobal(ex)}
                  disabled={forkingId === ex.id}
                  className="rounded-lg border border-neutral-200 px-3 py-3 text-sm disabled:opacity-50"
                  title="Eigene Kopie bearbeiten"
                >
                  {forkingId === ex.id ? '…' : '✎'}
                </button>
              </div>
            ))}
            {filteredGlobal.length === 0 && (
              <p className="text-sm text-neutral-400">Keine Übungen in dieser Kategorie.</p>
            )}
          </div>
        </section>
      )}
    </AppShell>
  );
}

export default function ExerciseListPage() {
  return (
    <RequireAuth>
      <ExerciseListInner />
    </RequireAuth>
  );
}
