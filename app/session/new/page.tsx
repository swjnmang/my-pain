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
  getSession,
  createSession,
  updateSession,
  deletePlannedTraining,
  updateUserExercise,
  forkExerciseToUserExercise,
  replaceExerciseIdInUserWorkouts,
} from '@/lib/data';
import { Exercise, ExerciseLog, PreSurvey, Category, CATEGORY_LABELS, Column, SetEntry, PAIN_AREA_LABELS } from '@/lib/types';
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
  const sessionIdParam = params.get('sessionId'); // optional: bestehendes Training aus dem Verlauf fortsetzen/bearbeiten

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
  const [editMode, setEditMode] = useState(false);

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
  const [resumedDate, setResumedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (sessionIdParam) {
      const loadSession = async () => {
        const [fetchedExercises, ownExercises, existing] = await Promise.all([
          getAllExercisesForUser(user!.uid),
          getUserExercises(user!.uid),
          getSession(user!.uid, sessionIdParam!),
        ]);
        setAllExercises(fetchedExercises);
        setOwnExerciseIds(new Set(ownExercises.map((ex) => ex.id)));
        if (!existing) {
          setError('Training nicht gefunden.');
          return;
        }
        setSourceName(existing.sourceName);
        setCategory(existing.category);
        setSurvey(existing.preSurvey);
        setResumedDate(existing.date);

        const resumedExercises: Exercise[] = [];
        const resumedLogs: Record<string, SetEntry[]> = {};
        const resumedComments: Record<string, string> = {};
        const resumedBlocks: { id: string; name: string }[] = [];
        const resumedExerciseBlockId: Record<string, string> = {};
        const seenBlocks = new Set<string>();

        for (const log of existing.exerciseLogs) {
          const ex =
            fetchedExercises.find((e) => e.id === log.exerciseId) ??
            ({
              id: log.exerciseId,
              name: log.exerciseName,
              category: existing.category,
              columns: log.columns,
            } as Exercise);
          resumedExercises.push(ex);
          resumedLogs[log.exerciseId] = log.sets;
          if (log.comment) resumedComments[log.exerciseId] = log.comment;
          const blockId = log.blockId || '__default__';
          const blockName = log.blockName || existing.sourceName || 'Training';
          if (!seenBlocks.has(blockId)) {
            seenBlocks.add(blockId);
            resumedBlocks.push({ id: blockId, name: blockName });
          }
          resumedExerciseBlockId[log.exerciseId] = blockId;
        }
        if (resumedBlocks.length === 0) {
          resumedBlocks.push({ id: '__default__', name: existing.sourceName || 'Training' });
        }

        setExercises(resumedExercises);
        setLogs(resumedLogs);
        setComments(resumedComments);
        setBlocks(resumedBlocks);
        setExerciseBlockId(resumedExerciseBlockId);
        setStartedAt(Date.now() - (existing.durationSec ?? 0) * 1000);
        setStep('log');
      };
      loadSession()
        .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
        .finally(() => setLoading(false));
      return;
    }
    if (!type || !id) return;
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
  }, [user, type, id, sessionIdParam]);

  useEffect(() => {
    if (step !== 'log' || !type || !id || !user || sessionIdParam) return;
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

  // Sorgt dafür, dass Änderungen an einer globalen (nicht-eigenen) Übung persistiert werden
  // können: die Übung wird einmalig in die eigene Sammlung geforkt und überall (aktuelles
  // Training + alle eigenen Trainingspläne, die die alte ID referenzieren) auf die neue ID
  // umgehängt, bevor der eigentliche Schreibvorgang stattfindet.
  async function ensureOwnExercise(ex: Exercise): Promise<Exercise> {
    if (!user || ownExerciseIds.has(ex.id)) return ex;
    const newId = await forkExerciseToUserExercise(user.uid, ex);
    const forked: Exercise = { ...ex, id: newId };
    setOwnExerciseIds((prev) => new Set(prev).add(newId));
    setExercises((prev) => prev.map((e) => (e.id === ex.id ? forked : e)));
    setLogs((prev) => {
      if (!(ex.id in prev)) return prev;
      const { [ex.id]: exLogs, ...rest } = prev;
      return { ...rest, [newId]: exLogs };
    });
    setComments((prev) => {
      if (!(ex.id in prev)) return prev;
      const { [ex.id]: comment, ...rest } = prev;
      return { ...rest, [newId]: comment };
    });
    setExerciseBlockId((prev) => {
      if (!(ex.id in prev)) return prev;
      const { [ex.id]: blockId, ...rest } = prev;
      return { ...rest, [newId]: blockId };
    });
    setPreviousLogs((prev) => {
      if (!(ex.id in prev)) return prev;
      const { [ex.id]: prior, ...rest } = prev;
      return { ...rest, [newId]: prior };
    });
    replaceExerciseIdInUserWorkouts(user.uid, ex.id, newId).catch(() => {
      // Verknüpfung mit anderen Trainingsplänen ist best-effort.
    });
    return forked;
  }

  async function handleColumnsChange(ex: Exercise, newColumns: Column[]) {
    const target = await ensureOwnExercise(ex);
    setExercises((prev) => prev.map((e) => (e.id === target.id ? { ...e, columns: newColumns } : e)));
    setLogs((prev) => ({
      ...prev,
      [target.id]: remapSetsToColumns(prev[target.id] ?? prev[ex.id] ?? [], ex.columns, newColumns),
    }));
    if (user) {
      try {
        await updateUserExercise(user.uid, target.id, exerciseWritePayload(target, { columns: newColumns }));
      } catch {
        // Spalten-Änderung bleibt trotzdem lokal für dieses Training gültig.
      }
    }
  }

  async function handleValueCommit(ex: Exercise, columnId: string, value: number) {
    if (!user) return;
    const target = await ensureOwnExercise(ex);
    const nextDefaults = { ...(target.defaultValues ?? {}), [columnId]: value };
    setExercises((prev) => prev.map((e) => (e.id === target.id ? { ...e, defaultValues: nextDefaults } : e)));
    try {
      await updateUserExercise(user.uid, target.id, exerciseWritePayload(target, { defaultValues: nextDefaults }));
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
      if (sessionIdParam) {
        await updateSession(user.uid, sessionIdParam, {
          date: resumedDate || new Date().toISOString().slice(0, 10),
          preSurvey: survey,
          exerciseLogs,
          ...(durationSec !== undefined ? { durationSec } : {}),
        });
      } else {
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
      }
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

  if (!sessionIdParam && (!type || !id)) {
    return <AppShell title="Training"><p className="text-sm text-red-600">Kein Training ausgewählt.</p></AppShell>;
  }

  const elapsedSec = startedAt ? Math.floor((nowTick - startedAt) / 1000) : 0;

  return (
    <AppShell title={sourceName || 'Training'}>
      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {!loading && step === 'survey' && (
        <div className="space-y-4 pb-24">
          <div className="space-y-1.5">
            <h2 className="text-[26px] font-bold tracking-tight">Kurzer Check-in</h2>
            <p className="text-[15px] leading-snug text-neutral-500">
              Damit du später siehst, wie Training und Schmerz zusammenhängen.
            </p>
          </div>

          <div className="space-y-3.5 rounded-2xl bg-white p-[18px]">
            <div className="flex items-baseline justify-between">
              <p className="text-base font-bold">Schmerzlevel</p>
              <p className="text-[28px] font-bold text-pain">
                {survey.painLevel}
                <span className="text-[15px] font-medium text-neutral-500">/10</span>
              </p>
            </div>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={survey.painLevel === n}
                  onClick={() => setSurvey({ ...survey, painLevel: n })}
                  className={clsx(
                    'h-11 rounded-[10px] p-0 text-sm',
                    survey.painLevel === n ? 'bg-pain font-bold text-white' : 'bg-neutral-100 font-semibold'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-neutral-500">
              <span>schmerzfrei</span>
              <span>unerträglich</span>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl bg-white p-[18px]">
            <p className="text-base font-bold">Wo?</p>
            <div className="flex flex-wrap gap-2">
              {Object.values(PAIN_AREA_LABELS).map((label) => {
                const regions = survey.painRegion
                  .split(',')
                  .map((r) => r.trim())
                  .filter(Boolean);
                const active = regions.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      const next = active ? regions.filter((r) => r !== label) : [...regions, label];
                      setSurvey({ ...survey, painRegion: next.join(', ') });
                    }}
                    className={clsx(
                      'h-10 rounded-full border px-3.5 text-sm',
                      active
                        ? 'border-accent bg-accent font-semibold text-white'
                        : 'border-neutral-300 bg-white font-medium'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              placeholder="Andere Region, z.B. rechte Hüfte"
              value={survey.painRegion}
              onChange={(e) => setSurvey({ ...survey, painRegion: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base"
              aria-label="Schmerzregion"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2.5 rounded-2xl bg-white p-4">
              <p className="text-sm font-semibold text-neutral-500">Schlaf</p>
              <p className="text-[26px] font-bold">
                {String(survey.sleepHours).replace('.', ',')}{' '}
                <span className="text-[15px] font-medium text-neutral-500">h</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Weniger Schlaf"
                  onClick={() => setSurvey({ ...survey, sleepHours: Math.max(0, survey.sleepHours - 0.5) })}
                  className="h-11 flex-1 rounded-xl bg-neutral-100 text-xl font-semibold"
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label="Mehr Schlaf"
                  onClick={() => setSurvey({ ...survey, sleepHours: Math.min(24, survey.sleepHours + 0.5) })}
                  className="h-11 flex-1 rounded-xl bg-neutral-100 text-xl font-semibold"
                >
                  +
                </button>
              </div>
            </div>
            <div className="space-y-2.5 rounded-2xl bg-white p-4">
              <p className="text-sm font-semibold text-neutral-500">Stimmung</p>
              <p className="text-[26px] font-bold">
                {survey.mood} <span className="text-[15px] font-medium text-neutral-500">/10</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Stimmung schlechter"
                  onClick={() => setSurvey({ ...survey, mood: Math.max(0, survey.mood - 1) })}
                  className="h-11 flex-1 rounded-xl bg-neutral-100 text-xl font-semibold"
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label="Stimmung besser"
                  onClick={() => setSurvey({ ...survey, mood: Math.min(10, survey.mood + 1) })}
                  className="h-11 flex-1 rounded-xl bg-neutral-100 text-xl font-semibold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur">
            <div className="mx-auto flex max-w-xl gap-2">
              <button
                onClick={() => {
                  setStartedAt(Date.now());
                  setStep('log');
                }}
                className="h-14 flex-1 rounded-xl bg-accent text-[17px] font-bold text-white"
              >
                Los geht&apos;s
              </button>
              {type === 'workout' && (
                <Link
                  href={`/training/edit/${id}`}
                  className="flex h-14 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 text-[15px] font-semibold"
                >
                  Bearbeiten
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && step === 'log' && (
        <div className="space-y-6 pb-24">
          {startedAt && (
            <div className="sticky top-0 z-10 -mx-5 mb-2 flex items-center justify-between bg-neutral-50/95 px-5 py-3 backdrop-blur">
              <span className="text-[13px] font-medium text-neutral-500">Trainingszeit</span>
              <span className="text-[22px] font-bold tabular-nums">{formatElapsed(elapsedSec)}</span>
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
                    <h2 className="mb-2 inline-flex h-8 items-center rounded-full bg-accent-soft px-3 text-[13px] font-semibold text-accent-dark">{block.name}</h2>
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
                        timer={ex.timer}
                        videoUrl={ex.videoUrl}
                        images={ex.images}
                        previousSets={previousLogs[ex.id]?.sets}
                        previousColumns={previousLogs[ex.id]?.columns}
                        note={ex.note}
                        editMode={editMode}
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

          {editMode && (!showAddPicker ? (
            <button
              onClick={() => setShowAddPicker(true)}
              className="w-full rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-center text-sm font-medium text-accent bg-white"
            >
              + Übung hinzufügen
            </button>
          ) : (
            <div className="rounded-2xl bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-medium">Übung hinzufügen</p>
                <button
                  onClick={() => setShowAddPicker(false)}
                  className="rounded-lg border border-neutral-200 px-2 py-1 text-xs bg-white"
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
                      addCategory === c ? 'bg-accent text-white' : 'bg-neutral-100 text-neutral-600'
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
                      className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-left bg-white"
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
          ))}

          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <button
                onClick={finishSession}
                disabled={saving || exercises.length === 0}
                className="flex-1 rounded-xl bg-neutral-900 px-4 py-3.5 text-base font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Speichert…' : 'Training speichern und beenden'}
              </button>
              <button
                onClick={() => setEditMode((prev) => !prev)}
                className="shrink-0 rounded-xl border border-neutral-300 bg-white px-4 py-3.5 text-base font-semibold text-neutral-700"
              >
                {editMode ? 'Trainingsmodus' : 'Bearbeitungsmodus'}
              </button>
            </div>
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
