'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getExercises, getUserExercises, getUserWorkout, updateUserWorkout } from '@/lib/data';
import { makeBlockId, defaultBlockName, flattenBlockExerciseIds } from '@/lib/blocks';
import { Category, CATEGORY_LABELS, Exercise, Block } from '@/lib/types';

const CATEGORIES: Category[] = ['oberkoerper', 'unterkoerper', 'ganzkoerper', 'warmup'];

function initialBlocks(): Block[] {
  return [{ id: makeBlockId(), name: 'Block 1', exerciseIds: [] }];
}

function EditWorkoutInner() {
  const { user } = useAuth();
  const router = useRouter();
  const routeParams = useParams();
  const workoutId = routeParams.id as string;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [ownExerciseIds, setOwnExerciseIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<Category>('oberkoerper');
  const [name, setName] = useState('');
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks());
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
        setBlocks(workout.blocks);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, [user, workoutId]);

  const selectedIds = new Set(flattenBlockExerciseIds(blocks));

  function toggleExercise(id: string) {
    if (selectedIds.has(id)) {
      setBlocks((prev) => prev.map((b) => ({ ...b, exerciseIds: b.exerciseIds.filter((x) => x !== id) })));
    } else {
      setBlocks((prev) => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        next[lastIdx] = { ...next[lastIdx], exerciseIds: [...next[lastIdx].exerciseIds, id] };
        return next;
      });
    }
  }

  function removeExerciseFromTraining(id: string) {
    setBlocks((prev) => prev.map((b) => ({ ...b, exerciseIds: b.exerciseIds.filter((x) => x !== id) })));
  }

  function reassignExerciseBlock(exerciseId: string, targetBlockId: string) {
    setBlocks((prev) => {
      const withoutEx = prev.map((b) => ({ ...b, exerciseIds: b.exerciseIds.filter((x) => x !== exerciseId) }));
      return withoutEx.map((b) =>
        b.id === targetBlockId ? { ...b, exerciseIds: [...b.exerciseIds, exerciseId] } : b
      );
    });
  }

  function moveExerciseWithinBlock(blockId: string, exerciseId: string, direction: 'up' | 'down') {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        const idx = b.exerciseIds.indexOf(exerciseId);
        if (idx === -1) return b;
        const swapWith = direction === 'up' ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= b.exerciseIds.length) return b;
        const nextIds = [...b.exerciseIds];
        [nextIds[idx], nextIds[swapWith]] = [nextIds[swapWith], nextIds[idx]];
        return { ...b, exerciseIds: nextIds };
      })
    );
  }

  function addBlock() {
    setBlocks((prev) => [...prev, { id: makeBlockId(), name: defaultBlockName(prev.length), exerciseIds: [] }]);
  }

  function renameBlock(blockId: string, blockName: string) {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, name: blockName } : b)));
  }

  function moveBlock(blockId: string, direction: 'up' | 'down') {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId);
      if (idx === -1) return prev;
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  function removeBlock(blockId: string) {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((b) => b.id === blockId);
      if (idx === -1) return prev;
      const target = prev[idx];
      const mergeInto = prev[idx > 0 ? idx - 1 : idx + 1];
      const next = prev.filter((b) => b.id !== blockId);
      return next.map((b) =>
        b.id === mergeInto.id ? { ...b, exerciseIds: [...b.exerciseIds, ...target.exerciseIds] } : b
      );
    });
  }

  async function handleSave() {
    const totalCount = flattenBlockExerciseIds(blocks).length;
    if (!user || !name.trim() || totalCount === 0) return;
    setSaving(true);
    setError(null);
    try {
      const finalBlocks = blocks.map((b, i) => ({ ...b, name: b.name.trim() || defaultBlockName(i) }));
      await updateUserWorkout(user.uid, workoutId, {
        name: name.trim(),
        category,
        blocks: finalBlocks,
      });
      router.replace('/training');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  const visibleExercises = exercises.filter((e) => e.category === category);
  const totalSelected = selectedIds.size;

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
                  setBlocks(initialBlocks());
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

          <div className="mb-4 space-y-4">
            <p className="text-sm font-medium">Blöcke</p>
            {blocks.map((block, bi) => (
              <div key={block.id} className="rounded-lg border border-neutral-200 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={block.name}
                    onChange={(e) => renameBlock(block.id, e.target.value)}
                    placeholder={defaultBlockName(bi)}
                    className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm font-medium"
                  />
                  <button
                    onClick={() => moveBlock(block.id, 'up')}
                    disabled={bi === 0}
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveBlock(block.id, 'down')}
                    disabled={bi === blocks.length - 1}
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removeBlock(block.id)}
                    disabled={blocks.length <= 1}
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-red-600 disabled:opacity-30"
                    title="Block entfernen"
                  >
                    ✕
                  </button>
                </div>

                {block.exerciseIds.length === 0 ? (
                  <p className="text-xs text-neutral-400">Noch keine Übungen in diesem Block.</p>
                ) : (
                  <div className="space-y-2">
                    {block.exerciseIds.map((id, i) => {
                      const ex = exercises.find((e) => e.id === id);
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2 rounded-lg border border-neutral-900 bg-neutral-50 px-3 py-2"
                        >
                          <span className="flex-1 text-sm">{ex?.name ?? id}</span>
                          <select
                            value={block.id}
                            onChange={(e) => reassignExerciseBlock(id, e.target.value)}
                            className="rounded-lg border border-neutral-300 px-1 py-1 text-xs"
                          >
                            {blocks.map((b2, i2) => (
                              <option key={b2.id} value={b2.id}>
                                {b2.name.trim() || defaultBlockName(i2)}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => moveExerciseWithinBlock(block.id, id, 'up')}
                            disabled={i === 0}
                            className="rounded-lg border border-neutral-200 px-2 py-1 text-xs disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveExerciseWithinBlock(block.id, id, 'down')}
                            disabled={i === block.exerciseIds.length - 1}
                            className="rounded-lg border border-neutral-200 px-2 py-1 text-xs disabled:opacity-30"
                          >
                            ▼
                          </button>
                          <button
                            onClick={() => removeExerciseFromTraining(id)}
                            className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={addBlock}
              className="w-full rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-center text-sm font-medium text-neutral-600"
            >
              + Block hinzufügen
            </button>
          </div>

          <div className="mb-24 space-y-2">
            {visibleExercises.map((ex) => (
              <div key={ex.id} className="flex items-center gap-2">
                <button
                  onClick={() => toggleExercise(ex.id)}
                  className={clsx(
                    'flex flex-1 items-center justify-between rounded-lg border px-4 py-3 text-left',
                    selectedIds.has(ex.id) ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
                  )}
                >
                  <span>{ex.name}</span>
                  {selectedIds.has(ex.id) && <span className="text-sm">✓</span>}
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
              disabled={saving || !name.trim() || totalSelected === 0}
              className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Speichert…' : `Änderungen speichern (${totalSelected} Übungen)`}
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
