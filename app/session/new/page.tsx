'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getExercises, getWorkoutTemplate, getUserWorkout, createSession } from '@/lib/data';
import { Exercise, ExerciseLog, PreSurvey, Category, WeightRepsSet, TimeSet } from '@/lib/types';

type Step = 'survey' | 'log';

function SessionInner() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const type = params.get('type'); // 'template' | 'workout'
  const id = params.get('id');

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

  useEffect(() => {
    if (!user || !type || !id) return;
    async function load() {
      const allExercises = await getExercises();
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
      for (const ex of sourceExercises) {
        initialLogs[ex.id] = ex.logType === 'time' ? [{ durationSec: 0 }] : [{ weight: 0, reps: 0 }];
      }
      setLogs(initialLogs);
    }
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, [user, type, id]);

  function addSet(exercise: Exercise) {
    setLogs((prev) => {
      const sets = prev[exercise.id] ?? [];
      const newSet = exercise.logType === 'time' ? { durationSec: 0 } : { weight: 0, reps: 0 };
      return { ...prev, [exercise.id]: [...sets, newSet] as WeightRepsSet[] | TimeSet[] };
    });
  }

  function updateSet(exercise: Exercise, index: number, field: string, value: number) {
    setLogs((prev) => {
      const sets = [...(prev[exercise.id] ?? [])] as unknown as Record<string, number>[];
      sets[index] = { ...sets[index], [field]: value };
      return { ...prev, [exercise.id]: sets as unknown as WeightRepsSet[] | TimeSet[] };
    });
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
        date: new Date().toISOString().slice(0, 10),
        preSurvey: survey,
        exerciseLogs,
        createdAt: Date.now(),
      });
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
            <div key={ex.id} className="rounded-lg border border-neutral-200 p-4">
              <p className="mb-3 font-medium">{ex.name}</p>
              <div className="space-y-2">
                {(logs[ex.id] ?? []).map((set, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 text-sm text-neutral-400">{i + 1}.</span>
                    {ex.logType === 'time' ? (
                      <input
                        type="number"
                        min={0}
                        placeholder="Sekunden"
                        value={(set as TimeSet).durationSec || ''}
                        onChange={(e) => updateSet(ex, i, 'durationSec', Number(e.target.value))}
                        className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-base"
                      />
                    ) : (
                      <>
                        <input
                          type="number"
                          min={0}
                          placeholder="kg"
                          value={(set as WeightRepsSet).weight || ''}
                          onChange={(e) => updateSet(ex, i, 'weight', Number(e.target.value))}
                          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-base"
                        />
                        <input
                          type="number"
                          min={0}
                          placeholder="Wdh."
                          value={(set as WeightRepsSet).reps || ''}
                          onChange={(e) => updateSet(ex, i, 'reps', Number(e.target.value))}
                          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-base"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => addSet(ex)}
                className="mt-3 text-sm text-neutral-500 underline"
              >
                + Satz hinzufügen
              </button>
            </div>
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
