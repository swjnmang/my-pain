'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import ExerciseSetEditor from '@/components/ExerciseSetEditor';
import { useAuth } from '@/lib/AuthContext';
import { getSession, updateSession, getAllExercisesForUser } from '@/lib/data';
import { Session, PreSurvey, ExerciseLog, WeightRepsSet, TimeSet, Exercise } from '@/lib/types';

function EditSessionInner() {
  const { user } = useAuth();
  const router = useRouter();
  const routeParams = useParams();
  const sessionId = routeParams.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [date, setDate] = useState('');
  const [survey, setSurvey] = useState<PreSurvey>({ painLevel: 0, painRegion: '', sleepHours: 7, mood: 5 });
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [exerciseMedia, setExerciseMedia] = useState<Record<string, Exercise>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !sessionId) return;
    Promise.all([getSession(user.uid, sessionId), getAllExercisesForUser(user.uid)])
      .then(([s, allExercises]) => {
        if (!s) {
          setError('Training nicht gefunden.');
          return;
        }
        setSession(s);
        setDate(s.date);
        setSurvey(s.preSurvey);
        setLogs(s.exerciseLogs);
        setExerciseMedia(Object.fromEntries(allExercises.map((ex) => [ex.id, ex])));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, [user, sessionId]);

  function updateLogSets(exerciseId: string, sets: WeightRepsSet[] | TimeSet[]) {
    setLogs((prev) => prev.map((log) => (log.exerciseId === exerciseId ? { ...log, sets } : log)));
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await updateSession(user.uid, sessionId, { date, preSurvey: survey, exerciseLogs: logs });
      router.replace('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title={session?.sourceName || 'Training bearbeiten'}>
      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {!loading && session && (
        <div className="space-y-6 pb-24">
          <div>
            <label className="mb-1 block text-sm font-medium">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </div>

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

          <div className="space-y-4">
            {logs.map((log) => (
              <ExerciseSetEditor
                key={log.exerciseId}
                name={log.exerciseName}
                logType={log.logType}
                sets={log.sets}
                onChange={(sets) => updateLogSets(log.exerciseId, sets)}
                videoUrl={exerciseMedia[log.exerciseId]?.videoUrl}
                images={exerciseMedia[log.exerciseId]?.images}
              />
            ))}
          </div>

          <div className="fixed inset-x-0 bottom-16 border-t border-neutral-200 bg-white p-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Speichert…' : 'Änderungen speichern'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function EditSessionPage() {
  return (
    <RequireAuth>
      <EditSessionInner />
    </RequireAuth>
  );
}
