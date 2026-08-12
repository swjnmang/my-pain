'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import ExerciseSetEditor from '@/components/ExerciseSetEditor';
import { useAuth } from '@/lib/AuthContext';
import {
  getSession,
  updateSession,
  deleteSession,
  getAllExercisesForUser,
  getUserExercises,
  updateUserExercise,
} from '@/lib/data';
import { remapSetsToColumns } from '@/lib/columns';
import { Session, PreSurvey, ExerciseLog, SetEntry, Column, Exercise } from '@/lib/types';

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

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
  const [ownExerciseIds, setOwnExerciseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user || !sessionId) return;
    Promise.all([getSession(user.uid, sessionId), getAllExercisesForUser(user.uid), getUserExercises(user.uid)])
      .then(([s, allExercises, ownExercises]) => {
        if (!s) {
          setError('Training nicht gefunden.');
          return;
        }
        setSession(s);
        setDate(s.date);
        setSurvey(s.preSurvey);
        setLogs(s.exerciseLogs);
        setExerciseMedia(Object.fromEntries(allExercises.map((ex) => [ex.id, ex])));
        setOwnExerciseIds(new Set(ownExercises.map((ex) => ex.id)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, [user, sessionId]);

  function updateLogSets(exerciseId: string, sets: SetEntry[]) {
    setLogs((prev) => prev.map((log) => (log.exerciseId === exerciseId ? { ...log, sets } : log)));
  }

  function updateLogComment(exerciseId: string, comment: string) {
    setLogs((prev) => prev.map((log) => (log.exerciseId === exerciseId ? { ...log, comment } : log)));
  }

  function moveLog(exerciseId: string, direction: 'up' | 'down') {
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.exerciseId === exerciseId);
      if (idx === -1) return prev;
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  async function updateLogColumns(log: ExerciseLog, newColumns: Column[]) {
    setLogs((prev) =>
      prev.map((l) =>
        l.exerciseId === log.exerciseId
          ? { ...l, columns: newColumns, sets: remapSetsToColumns(l.sets, log.columns, newColumns) }
          : l
      )
    );
    const exercise = exerciseMedia[log.exerciseId];
    if (user && exercise && ownExerciseIds.has(log.exerciseId)) {
      try {
        await updateUserExercise(user.uid, log.exerciseId, {
          name: exercise.name,
          category: exercise.category,
          columns: newColumns,
          ...(exercise.videoUrl ? { videoUrl: exercise.videoUrl } : {}),
          ...(exercise.images ? { images: exercise.images } : {}),
          ...(exercise.painAreas ? { painAreas: exercise.painAreas } : {}),
          ...(exercise.note ? { note: exercise.note } : {}),
        });
      } catch {
        // Spalten-Änderung bleibt trotzdem in diesem Training gespeichert.
      }
    }
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

  async function handleDelete() {
    if (!user) return;
    if (!window.confirm('Dieses Training wirklich löschen?')) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteSession(user.uid, sessionId);
      router.replace('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.');
    } finally {
      setDeleting(false);
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
            {session.durationSec !== undefined && (
              <p className="mt-1 text-xs text-neutral-400">Dauer: {formatDuration(session.durationSec)}</p>
            )}
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
            {logs.map((log, i) => (
              <ExerciseSetEditor
                key={log.exerciseId}
                name={log.exerciseName}
                columns={log.columns}
                sets={log.sets}
                onChange={(sets) => updateLogSets(log.exerciseId, sets)}
                onColumnsChange={(columns) => updateLogColumns(log, columns)}
                videoUrl={exerciseMedia[log.exerciseId]?.videoUrl}
                images={exerciseMedia[log.exerciseId]?.images}
                note={exerciseMedia[log.exerciseId]?.note}
                comment={log.comment}
                onCommentChange={(comment) => updateLogComment(log.exerciseId, comment)}
                canMoveUp={i > 0}
                canMoveDown={i < logs.length - 1}
                onMove={(direction) => moveLog(log.exerciseId, direction)}
              />
            ))}
          </div>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
          >
            {deleting ? 'Löscht…' : 'Training löschen'}
          </button>

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
