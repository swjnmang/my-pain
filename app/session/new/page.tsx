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
} from '@/lib/data';
import {
  Exercise,
  ExerciseLog,
  PreSurvey,
  Category,
  CATEGORY_LABELS,
  WeightRepsSet,
  TimeSet,
} from '@/lib/types';
import { getDefaultSets } from '@/lib/exerciseDefaults';
import {
  getActiveSessionDraft,
  saveActiveSessionDraft,
  clearActiveSessionDraft,
  draftMatches,
} from '@/lib/activeSession';

const CATEGORIES: Category[] = ['oberkoerper', 'unterkoerper', 'ganzkoerper', 'warmup'];

type Step = 'survey' | 'log';

function normalizeToThreeSets(sets: WeightRepsSet[] | TimeSet[]): WeightRepsSet[] | TimeSet[] {
  const copies = sets.map((s) => ({ ...s })) as (WeightRepsSet | TimeSet)[];
  const result = copies.slice(0, 3);
  while (result.length < 3) {
    result.push({ ...result[result.length - 1] });
  }
  return result as WeightRepsSet[] | TimeSet[];
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

  const [logs, setLogs] = useState<Record<string, WeightRepsSet[] | TimeSet[]>>({});
  const [previousLogs, setPreviousLogs] = useState<Record<string, WeightRepsSet[] | TimeSet[]>>({});

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
      const sourceExercises = source.exerciseIds
        .map((exId) => fetchedExercises.find((e) => e.id === exId))
        .filter((e): e is Exercise => Boolean(e));

      const initialLogs: Record<string, WeightRepsSet[] | TimeSet[]> = {};
      const previous: Record<string, WeightRepsSet[] | TimeSet[]> = {};
      for (const ex of sourceExercises) {
        const priorSession = pastSessions.find((s) =>
          s.exerciseLogs.some((l) => l.exerciseId === ex.id && l.sets.length > 0)
        );
        const priorLog = priorSession?.exerciseLogs.find((l) => l.exerciseId === ex.id);
        if (priorLog && priorLog.sets.length > 0) {
          previous[ex.id] = priorLog.sets;
          initialLogs[ex.id] = normalizeToThreeSets(priorLog.sets);
        } else {
          initialLogs[ex.id] = getDefaultSets(ex.id, ex.logType);
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
        setStep('log');
      } else {
        setExercises(sourceExercises);
        setLogs(initialLogs);
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
      exerciseIds: exercises.map((ex) => ex.id),
      startedAt: existing?.startedAt ?? Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, logs, survey, exercises, user]);

  function removeExercise(exerciseId: string) {
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
    setLogs((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
  }

  function addExercise(ex: Exercise) {
    setExercises((prev) => (prev.some((e) => e.id === ex.id) ? prev : [...prev, ex]));
    setLogs((prev) => (prev[ex.id] ? prev : { ...prev, [ex.id]: getDefaultSets(ex.id, ex.logType) }));
    setShowAddPicker(false);
  }

  async function finishSession() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const exerciseLogs: ExerciseLog[] = exercises.map((ex) => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        logType: ex.logType,
        sets: logs[ex.id] ?? [],
      }));
      await createSession(user.uid, {
        sourceId: id!,
        sourceName,
        category,
        date: dateParam || new Date().toISOString().slice(0, 10),
        preSurvey: survey,
        exerciseLogs,
        createdAt: Date.now(),
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
              onClick={() => setStep('log')}
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
          {exercises.length === 0 && (
            <p className="text-sm text-neutral-500">
              Keine Übungen mehr in diesem Training. Füge unten mindestens eine hinzu, um fortzufahren.
            </p>
          )}

          {exercises.map((ex) => (
            <ExerciseSetEditor
              key={ex.id}
              name={ex.name}
              logType={ex.logType}
              sets={logs[ex.id] ?? []}
              onChange={(sets) => setLogs((prev) => ({ ...prev, [ex.id]: sets }))}
              videoUrl={ex.videoUrl}
              images={ex.images}
              previousSets={previousLogs[ex.id]}
              note={ex.note}
              editHref={ownExerciseIds.has(ex.id) ? `/exercises/${ex.id}/edit` : undefined}
              onRemove={() => removeExercise(ex.id)}
            />
          ))}

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
              {saving ? 'Speichert…' : 'Training abschließen'}
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
