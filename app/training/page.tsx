'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getWorkoutTemplates, getUserWorkouts } from '@/lib/data';
import { Category, CATEGORY_LABELS, WorkoutTemplate, Workout } from '@/lib/types';

const CATEGORIES: Category[] = ['oberkoerper', 'unterkoerper', 'ganzkoerper', 'warmup'];

function TrainingListInner() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [ownWorkouts, setOwnWorkouts] = useState<Workout[]>([]);
  const [filter, setFilter] = useState<Category | 'alle'>('alle');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getWorkoutTemplates(), getUserWorkouts(user.uid)])
      .then(([t, w]) => {
        setTemplates(t);
        setOwnWorkouts(w);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, [user]);

  const filteredTemplates = templates.filter((t) => filter === 'alle' || t.category === filter);
  const filteredOwn = ownWorkouts.filter((w) => filter === 'alle' || w.category === filter);

  return (
    <AppShell title="Training">
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
        <Link
          href="/generator"
          className="whitespace-nowrap rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800"
        >
          Nach Schmerzbereich
        </Link>
      </div>

      <Link
        href="/training/builder"
        className="mb-6 block rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-center text-sm font-medium text-neutral-600"
      >
        + Eigenes Training erstellen
      </Link>

      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && filteredOwn.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">Meine Trainings</h2>
          <div className="space-y-2">
            {filteredOwn.map((w) => (
              <div key={w.id} className="flex items-center gap-2">
                <Link
                  href={`/session/new?type=workout&id=${w.id}`}
                  className="block flex-1 rounded-lg border border-neutral-200 px-4 py-3"
                >
                  <p className="font-medium">{w.name}</p>
                  <p className="text-sm text-neutral-500">
                    {CATEGORY_LABELS[w.category]} · {w.exerciseIds.length} Übungen
                  </p>
                </Link>
                <Link
                  href={`/training/edit/${w.id}`}
                  className="rounded-lg border border-neutral-200 px-3 py-3 text-sm"
                  title="Training bearbeiten"
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
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">Vorgefertigte Trainings</h2>
          <div className="space-y-2">
            {filteredTemplates.map((t) => (
              <Link
                key={t.id}
                href={`/session/new?type=template&id=${t.id}`}
                className="block rounded-lg border border-neutral-200 px-4 py-3"
              >
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-neutral-500">
                  {CATEGORY_LABELS[t.category]} · {t.exerciseIds.length} Übungen
                </p>
              </Link>
            ))}
            {filteredTemplates.length === 0 && (
              <p className="text-sm text-neutral-400">Keine Trainings in dieser Kategorie.</p>
            )}
          </div>
        </section>
      )}
    </AppShell>
  );
}

export default function TrainingPage() {
  return (
    <RequireAuth>
      <TrainingListInner />
    </RequireAuth>
  );
}
