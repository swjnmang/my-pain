'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import ExerciseSetEditor from '@/components/ExerciseSetEditor';
import { useAuth } from '@/lib/AuthContext';
import {
  getAllExercisesForUser,
  getUserExercises,
  getWorkoutTemplate,
  getUserWorkout,
  getSessions,
  createSession,
  deletePlannedTraining,
  updateUserExercise,
} from '@/lib/data';
import { Exercise, ExerciseLog, PreSurvey, Category, CATEGORY_LABELS, Column, SetEntry } from '@/lib/types';
import { getDefaultSets } from '@/lib/exerciseDefaults';
import { exerciseWritePayload, remapSetsToColumns } from '@/lib/columns';
import {
  getActiveSessionDraft,
  saveActiveSessionDraft,
  clearActiveSessionDraft,
  draftMatches,
} from '@/lib/activeSession';

const CATEGORIES: Category[] = ['oberkoerper', 'unterkoerper', 'ganzkoerper', 'warmup'];

type Step = 'survey' | 'log';

function prepareInitialSets(sets: SetEntry[], fromColumns: Column[], toColumns: Column[]): SetEntry[] {
  // Neues Training: Werte vom letzten Mal übernehmen, aber "erledigt" nie vorbelegen.
  const remapped = remapSetsToColumns(sets, fromColumns, toColumns).map((s) => ({
    values: { ...s.values },
  }));
  const result = remapped.slice(0, 3);
  while (result.length > 0 && result.length < 3) {
    result.push({ values: { ...result[result.length - 1].values } });
  }
  return result;
}

function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function SessionInner() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const type = params.get('type'); // 'template' | 'workout'
  const id = params.get('id');
  const dateParam = params.get('date'); // optional: YYYY-MM-DD, sonst heute
  const planId = params.get('planId'); // optional: geplante Trainingseinheit, die bei Abschluss gelöscht wird

  const [step, setStep] = useState<Step>('survey');
  const [sourceName, setSourceName] = useState('');
  const [category, setCategory] = useState<Category>('ganzkoerper');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [ownExerciseIds, setOwnExerciseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addCategory, setAddCategory] = useState<Category>('oberkoerper');

  const [survey, setSurvey] = useState<PreSurvey>({
    painLevel: 0,
    painRegion: '',
    sleepHours: 7,
    mood: 5,
  });

  const [logs, setLogs] = useState<Record<string, SetEntry[]>>({});
  const [previousLogs, setPreviousLogs] = useState<Record<string, { columns: Column[]; sets: SetEntry[] }>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [blocks, setBlocks] = useState<{ id: string; name: string }[]>([]);
  const [exerciseBlockId, setExerciseBlockId] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  useEffect(() => {
    if (!user || !type || !id) return;
    async function load() {
      const [fetchedExercises, ownExercises, pastSessions] = await Promise.all([
        getAllExercisesForUser(user!.uid),
        getUserExercises(user!.uid),
        getSessions(user!.uid),
      ]);
      setAllExercises(fetchedExercises);
      setOwnExerciseIds(new Set(ownExercises.map((ex) => ex.id)));
      const source =
        type === 'template' ? await getWorkoutTemplate(id!) : await getUserWorkout(user!.uid, id!);
      if (!source) {
        setError('Training nicht gefunden.');
        return;
      }
      setSourceName(source.name);
      setCategory(source.category);
      const sourceExercises: Exercise[] = [];
      const sourceBlockIdByExercise: Record<string, string> = {};
      for (const block of source.blocks) {
        for (const exId of block.exerciseIds) {
          const ex = fetchedExercises.find((e) => e.id === exId);
          if (ex) {
            sourceExercises.push(ex);
            sourceBlockIdByExercise[ex.id] = block.id;
          }
        }
      }
      const sourceBlocks = source.blocks.map((b) => ({ id: b.id, name: b.name }));

      const initialLogs: Record<string, SetEntry[]> = {};
      const previous: Record<string, { columns: Column[]; sets: SetEntry[] }> = {};
      const initialComments: Record<string, string> = {};
      for (const ex of sourceExercises) {
        const priorSession = pastSessions.find((s) =>
          s.exerciseLogs.some((l) => l.exerciseId === ex.id && l.sets.length > 0)
        );
        const priorLog = priorSession?.exerciseLogs.find((l) => l.exerciseId === ex.id);
        if (priorLog && priorLog.sets.length > 0) {
          previous[ex.id] = { columns: priorLog.columns, sets: priorLog.sets };
          initialLogs[ex.id] = prepareInitialSets(priorLog.sets, priorLog.columns, ex.columns);
        } else {
          initialLogs[ex.id] = getDefaultSets(ex);
        }
        const commentSession = pastSessions.find((s) =>
          s.exerciseLogs.some((l) => l.exerciseId === ex.id && l.comment)
        );
        const priorComment = commentSession?.exerciseLogs.find((l) => l.exerciseId === ex.id)?.comment;
        if (priorComment) {
          initialComments[ex.id] = priorComment;
        }
      }
      setPreviousLogs(previous);

      const effectiveDate = dateParam || new Date().toISOString().slice(0, 10);
      const draft = getActiveSessionDraft(user!.uid);
      if (draftMatches(draft, type, id, effectiveDate, planId)) {
        const draftExercises = (draft.exerciseIds ?? [])
          .map((exId) => fetchedExercises.find((e) => e.id === exId))
          .filter((e): e is Exercise => Boolean(e));
        setExercises(draftExercises.length > 0 ? draftExercises : sourceExercises);
        setSurvey(draft.survey);
        setLogs(draft.logs);
        setComments(draft.comments ?? initialComments);
        setBlocks(draft.blocks?.length ? draft.blocks : sourceBlocks);
        setExerciseBlockId(
          draft.exerciseBlockId && Object.keys(draft.exerciseBlockId).length > 0
            ? draft.exerciseBlockId
            : sourceBlockIdByExercise
        );
        setStartedAt(draft.startedAt);
        setStep('log');
      } else {
        setExercises(sourceExercises);
        setLogs(initialLogs);
        setComments(initialComments);
        setBlocks(sourceBlocks);
        setExerciseBlockId(sourceBlockIdByExercise);
      }
    }
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, type, id]);

  useEffect(() => {
    if (step !== 'log' || !type || !id || !user) return;
    const existing = getActiveSessionDraft(user.uid);
    saveActiveSessionDraft(user.uid, {
      type: type as 'template' | 'workout',
      id,
      date: dateParam || new Date().toISOString().slice(0, 10),
      planId: planId ?? null,
      sourceName,
      category,
      survey,
      logs,
      comments,
      exerciseIds: exercises.map((ex) => ex.id),
      blocks,
      exerciseBlockId,
      startedAt: existing?.startedAt ?? startedAt ?? Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, logs, comments, survey, exercises, blocks, exerciseBlockId, user]);

  useEffect(() => {
    if (step !== 'log' || !startedAt) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [step, startedAt]);

  function removeExercise(exerciseId: string) {
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
    setLogs((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
    setComments((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
    setExerciseBlockId((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
  }

  function addExercise(ex: Exercise) {
    setExercises((prev) => (prev.some((e) => e.id === ex.id) ? prev : [...prev, ex]));
    setLogs((prev) => (prev[ex.id] ? prev : { ...prev, [ex.id]: getDefaultSets(ex) }));
    setExerciseBlockId((prev) => {
      if (prev[ex.id] || blocks.length === 0) return prev;
      return { ...prev, [ex.id]: blocks[blocks.length - 1].id };
    });
    setShowAddPicker(false);
  }

  function moveExercise(exerciseId: string, direction: 'up' | 'down') {
    setExercises((prev) => {
      const blockId = exerciseBlockId[exerciseId];
      const idx = prev.findIndex((e) => e.id === exerciseId);
      if (idx === -1) return prev;
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      if (exerciseBlockId[prev[swapWith].id] !== blockId) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  async function handleColumnsChange(ex: Exercise, newColumns: Column[]) {
    setExercises((prev) => prev.map((e) => (e.id === ex.id ? { ...e, columns: newColumns } : e)));
    setLogs((prev) => ({
      ...prev,
      [ex.id]: remapSetsToColumns(prev[ex.id] ?? [], ex.columns, newColumns),
    }));
    if (user && ownExerciseIds.has(ex.id)) {
      try {
        await updateUserExercise(user.uid, ex.id, exerciseWritePayload(ex, { columns: newColumns }));
      } catch {
        // Spalten-Änderung bleibt trotzdem lokal für dieses Training gültig.
      }
    }
  }

  async function handleValueCommit(ex: Exercise, columnId: string, value: number) {
    if (!user || !ownExerciseIds.has(ex.id)) return;
    const nextDefaults = { ...(ex.defaultValues ?? {}), [columnId]: value };
    setExercises((prev) => prev.map((e) => (e.id === ex.id ? { ...e, defaultValues: nextDefaults } : e)));
    try {
      await updateUserExercise(user.uid, ex.id, exerciseWritePayload(ex, { defaultValues: nextDefaults }));
    } catch {
      // Vorlagen-Update ist best-effort; lokale Werte im Training bleiben unverändert korrekt.
    }
  }

  async function finishSession() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const exerciseLogs: ExerciseLog[] = exercises.map((ex) => {
        const block = blocks.find((b) => b.id === exerciseBlockId[ex.id]);
        return {
          exerciseId: ex.id,
          exerciseName: ex.name,
          ...(block ? { blockId: block.id, blockName: block.name } : {}),
          columns: ex.columns,
          sets: logs[ex.id] ?? [],
          ...(comments[ex.id] ? { comment: comments[ex.id] } : {}),
        };
      });
      const durationSec = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : undefined;
      await createSession(user.uid, {
        sourceId: id!,
        sourceName,
        category,
        date: dateParam || new Date().toISOString().slice(0, 10),
        preSurvey: survey,
        exerciseLogs,
        createdAt: Date.now(),
        ...(durationSec !== undefined ? { durationSec } : {}),
      });
      if (planId) {
        await deletePlannedTraining(user.uid, planId);
      }
      clearActiveSessionDraft(user.uid);
      router.replace('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  if (!type || !id) {
    return <AppShell title="Training"><p className="text-sm text-red-600">Kein Training ausgewählt.</p></AppShell>;
  }

  const elapsedSec = startedAt ? Math.floor((nowTick - startedAt) / 1000) : 0;

  return (
    <AppShell title={sourceName || 'Training'}>
      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {!loading && step === 'survey' && (
        <div className="space-y-6">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Schmerzlevel vor dem Training: {survey.painLevel}/10
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={survey.painLevel}
              onChange={(e) => setSurvey({ ...survey, painLevel: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Schmerzregion</label>
            <input
              type="text"
              placeholder="z.B. rechte Hüfte"
              value={survey.painRegion}
              onChange={(e) => setSurvey({ ...survey, painRegion: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Schlafstunden letzte Nacht</label>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={survey.sleepHours}
              onChange={(e) => setSurvey({ ...survey, sleepHours: Number(e.target.value) })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Stimmung: {survey.mood}/10</label>
            <input
              type="range"
              min={0}
              max={10}
              value={survey.mood}
              onChange={(e) => setSurvey({ ...survey, mood: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setStartedAt(Date.now());
                setStep('log');
              }}
              className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white"
            >
              Training starten
            </button>
            {type === 'workout' && (
              <Link
                href={`/training/edit/${id}`}
                className="flex items-center justify-center rounded-lg border border-neutral-300 px-4 py-2.5 text-base font-medium"
              >
                Training bearbeiten
              </Link>
            )}
          </div>
        </div>
      )}

      {!loading && step === 'log' && (
        <div className="space-y-6 pb-24">
          {startedAt && (
            <div className="sticky top-0 z-10 -mx-4 mb-2 border-b border-neutral-200 bg-white px-4 py-2 text-center text-sm font-medium text-neutral-600">
              ⏱ {formatElapsed(elapsedSec)}
            </div>
          )}

          {exercises.length === 0 && (
            <p className="text-sm text-neutral-500">
              Keine Übungen mehr in diesem Training. Füge unten mindestens eine hinzu, um fortzufahren.
            </p>
          )}

          {(() => {
            const nonEmptyBlocks = blocks.filter((b) =>
              exercises.some((ex) => exerciseBlockId[ex.id] === b.id)
            );
            const showBlockHeaders = nonEmptyBlocks.length > 1;
            return nonEmptyBlocks.map((block) => {
              const blockExercises = exercises.filter((ex) => exerciseBlockId[ex.id] === block.id);
              return (
                <div key={block.id}>
                  {showBlockHeaders && (
                    <h2 className="mb-2 text-sm font-semibold text-neutral-500">{block.name}</h2>
                  )}
                  <div className="space-y-6">
                    {blockExercises.map((ex, i) => (
                      <ExerciseSetEditor
                        key={ex.id}
                        name={ex.name}
                        columns={ex.columns}
                        sets={logs[ex.id] ?? []}
                        onChange={(sets) => setLogs((prev) => ({ ...prev, [ex.id]: sets }))}
                        onColumnsChange={(columns) => handleColumnsChange(ex, columns)}
                        onValueCommit={(columnId, value) => handleValueCommit(ex, columnId, value)}
                        videoUrl={ex.videoUrl}
                        images={ex.images}
                        previousSets={previousLogs[ex.id]?.sets}
                        previousColumns={previousLogs[ex.id]?.columns}
                        note={ex.note}
                        editHref={ownExerciseIds.has(ex.id) ? `/exercises/${ex.id}/edit` : undefined}
                        onRemove={() => removeExercise(ex.id)}
                        comment={comments[ex.id]}
                        onCommentChange={(comment) => setComments((prev) => ({ ...prev, [ex.id]: comment }))}
                        canMoveUp={i > 0}
                        canMoveDown={i < blockExercises.length - 1}
                        onMove={(direction) => moveExercise(ex.id, direction)}
                      />
                    ))}
                  </div>
                </div>
              );
            });
          })()}

          {!showAddPicker ? (
            <button
              onClick={() => setShowAddPicker(true)}
              className="w-full rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-center text-sm font-medium text-neutral-600"
            >
              + Übung hinzufügen
            </button>
          ) : (
            <div className="rounded-lg border border-neutral-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-medium">Übung hinzufügen</p>
                <button
                  onClick={() => setShowAddPicker(false)}
                  className="rounded-lg border border-neutral-200 px-2 py-1 text-xs"
                >
                  Schließen
                </button>
              </div>

              <div className="mb-3 flex gap-2 overflow-x-auto">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAddCategory(c)}
                    className={clsx(
                      'shrink-0 rounded-full px-3 py-1.5 text-sm',
                      addCategory === c ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
                    )}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {allExercises
                  .filter((ex) => ex.category === addCategory && !exercises.some((e) => e.id === ex.id))
                  .map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex)}
                      className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-left"
                    >
                      <span>{ex.name}</span>
                    </button>
                  ))}
                {allExercises.filter(
                  (ex) => ex.category === addCategory && !exercises.some((e) => e.id === ex.id)
                ).length === 0 && (
                  <p className="text-sm text-neutral-400">Keine weiteren Übungen in dieser Kategorie.</p>
                )}
              </div>
            </div>
          )}

          <div className="fixed inset-x-0 bottom-16 border-t border-neutral-200 bg-white p-4">
            <button
              onClick={finishSession}
              disabled={saving || exercises.length === 0}
              className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Speichert…' : 'Training speichern und beenden'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function NewSessionPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <SessionInner />
      </Suspense>
    </RequireAuth>
  );
}
