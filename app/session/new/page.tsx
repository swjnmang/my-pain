'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import ExerciseSetEditor from '@/components/ExerciseSetEditor';
import { useAuth } from '@/lib/AuthContext';
import {
  getAllExercisesForUser,
  getWorkoutTemplate,
  getUserWorkout,
  getSessions,
  createSession,
  deletePlannedTraining,
} from '@/lib/data';
import { Exercise, ExerciseLog, PreSurvey, Category, WeightRepsSet, TimeSet } from '@/lib/types';

type Step = 'survey' | 'log';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      const [allExercises, pastSessions] = await Promise.all([
        getAllExercisesForUser(user!.uid),
        getSessions(user!.uid),
      ]);
      const source =
        type === 'template' ? await getWorkoutTemplate(id!) : await getUserWorkout(user!.uid, id!);
      if (!source) {
        setError('Training nicht gefunden.');
        return;
      }
      setSourceName(source.name);
      setCategory(source.category);
      const sourceExercises = source.exerciseIds
        .map((exId) => allExercises.find((e) => e.id === exId))
        .filter((e): e is Exercise => Boolean(e));
      setExercises(sourceExercises);

      const initialLogs: Record<string, WeightRepsSet[] | TimeSet[]> = {};
      const previous: Record<string, WeightRepsSet[] | TimeSet[]> = {};
      for (const ex of sourceExercises) {
        const priorSession = pastSessions.find((s) =>
          s.exerciseLogs.some((l) => l.exerciseId === ex.id && l.sets.length > 0)
        );
        const priorLog = priorSession?.exerciseLogs.find((l) => l.exerciseId === ex.id);
        if (priorLog && priorLog.sets.length > 0) {
          previous[ex.id] = priorLog.sets;
          initialLogs[ex.id] = priorLog.sets.map((s) => ({ ...s })) as WeightRepsSet[] | TimeSet[];
        } else {
          initialLogs[ex.id] = ex.logType === 'time' ? [{ durationSec: 0 }] : [{ weight: 0, reps: 0 }];
        }
      }
      setLogs(initialLogs);
      setPreviousLogs(previous);
    }
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, [user, type, id]);

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

          <button
            onClick={() => setStep('log')}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white"
          >
            Training starten
          </button>
        </div>
      )}

      {!loading && step === 'log' && (
        <div className="space-y-6 pb-24">
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
            />
          ))}

          <div className="fixed inset-x-0 bottom-16 border-t border-neutral-200 bg-white p-4">
            <button
              onClick={finishSession}
              disabled={saving}
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
