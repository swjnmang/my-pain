'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/lib/AuthContext';
import { getSessions } from '@/lib/data';
import { Session } from '@/lib/types';

export default function ProgressCharts() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    getSessions(user.uid)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [user]);

  const painData = useMemo(
    () =>
      [...sessions]
        .reverse()
        .map((s) => ({ date: s.date, Schmerz: s.preSurvey.painLevel })),
    [sessions]
  );

  const exerciseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sessions) {
      for (const log of s.exerciseLogs) {
        if (log.columns.some((c) => c.unit === 'kg')) map.set(log.exerciseId, log.exerciseName);
      }
    }
    return Array.from(map.entries());
  }, [sessions]);

  useEffect(() => {
    if (!selectedExerciseId && exerciseOptions.length > 0) {
      setSelectedExerciseId(exerciseOptions[0][0]);
    }
  }, [exerciseOptions, selectedExerciseId]);

  const strengthData = useMemo(() => {
    if (!selectedExerciseId) return [];
    return [...sessions]
      .reverse()
      .map((s) => {
        const log = s.exerciseLogs.find((l) => l.exerciseId === selectedExerciseId);
        if (!log) return null;
        const kgCol = log.columns.find((c) => c.unit === 'kg');
        const maxWeight = kgCol
          ? Math.max(0, ...log.sets.map((set) => set.values[kgCol.id] ?? 0))
          : 0;
        return { date: s.date, 'Max. Gewicht (kg)': maxWeight };
      })
      .filter((d): d is { date: string; 'Max. Gewicht (kg)': number } => Boolean(d));
  }, [sessions, selectedExerciseId]);

  if (loading) return <p className="text-sm text-neutral-500">Lädt…</p>;

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Noch keine Trainings geloggt. Starte dein erstes Training, um hier Verläufe zu sehen.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-500">Schmerzverlauf</h2>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={painData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="Schmerz" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {exerciseOptions.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-500">Kraftfortschritt</h2>
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
            >
              {exerciseOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={strengthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="Max. Gewicht (kg)" stroke="#171717" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
