'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getExercises, getUserExercises, createUserWorkout } from '@/lib/data';
import { makeBlockId, defaultBlockName, flattenBlockExerciseIds } from '@/lib/blocks';
import { Category, CATEGORY_LABELS, Exercise, Block } from '@/lib/types';

const CATEGORIES: Category[] = ['oberkoerper', 'unterkoerper', 'ganzkoerper', 'warmup'];

function initialBlocks(): Block[] {
  return [{ id: makeBlockId(), name: 'Block 1', exerciseIds: [] }];
}

function BuilderInner() {
  const { user } = useAuth();
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [ownExerciseIds, setOwnExerciseIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<Category>('oberkoerper');
  const [name, setName] = useState('');
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks());
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
      await createUserWorkout(user.uid, {
        name: name.trim(),
        category,
        blocks: finalBlocks,
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
  const totalSelected = selectedIds.size;

  return (
    <AppShell title="Training erstellen">
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Mein Oberkörper-Training"
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
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
              category === c ? 'bg-accent text-white' : 'bg-neutral-100 text-neutral-600'
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
        className="mb-4 block rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-center text-sm font-medium text-accent"
      >
        + Eigene Übung anlegen
      </Link>

      <div className="mb-4 space-y-4">
        <p className="text-sm font-medium">Blöcke</p>
        {blocks.map((block, bi) => (
          <div key={block.id} className="rounded-lg border border-neutral-200 p-3 bg-white">
            <div className="mb-2 flex items-center gap-2">
              <input
                value={block.name}
                onChange={(e) => renameBlock(block.id, e.target.value)}
                placeholder={defaultBlockName(bi)}
                className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm font-medium bg-white"
              />
              <button
                onClick={() => moveBlock(block.id, 'up')}
                disabled={bi === 0}
                className="rounded-lg border border-neutral-200 px-2 py-1 text-xs disabled:opacity-30 bg-white"
              >
                ▲
              </button>
              <button
                onClick={() => moveBlock(block.id, 'down')}
                disabled={bi === blocks.length - 1}
                className="rounded-lg border border-neutral-200 px-2 py-1 text-xs disabled:opacity-30 bg-white"
              >
                ▼
              </button>
              <button
                onClick={() => removeBlock(block.id)}
                disabled={blocks.length <= 1}
                className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-red-600 disabled:opacity-30 bg-white"
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
                      className="flex items-center gap-2 rounded-lg border border-accent bg-accent-soft px-3 py-2"
                    >
                      <span className="flex-1 text-sm">{ex?.name ?? id}</span>
                      <select
                        value={block.id}
                        onChange={(e) => reassignExerciseBlock(id, e.target.value)}
                        className="rounded-lg border border-neutral-300 px-1 py-1 text-xs bg-white"
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
                        className="rounded-lg border border-neutral-200 px-2 py-1 text-xs disabled:opacity-30 bg-white"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveExerciseWithinBlock(block.id, id, 'down')}
                        disabled={i === block.exerciseIds.length - 1}
                        className="rounded-lg border border-neutral-200 px-2 py-1 text-xs disabled:opacity-30 bg-white"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => removeExerciseFromTraining(id)}
                        className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-red-600 bg-white"
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
          className="w-full rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-center text-sm font-medium text-accent"
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
                selectedIds.has(ex.id) ? 'border-accent bg-accent-soft' : 'border-neutral-200 bg-white'
              )}
            >
              <span>{ex.name}</span>
              {selectedIds.has(ex.id) && <span className="text-sm">✓</span>}
            </button>
            {ownExerciseIds.has(ex.id) && (
              <Link
                href={`/exercises/${ex.id}/edit`}
                className="rounded-2xl bg-white px-4 py-3 text-sm text-neutral-500"
                title="Übung bearbeiten"
              >
                ✎
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || totalSelected === 0}
          className="w-full rounded-xl bg-neutral-900 px-4 py-3.5 text-base font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Speichert…' : `Training speichern (${totalSelected} Übungen)`}
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
