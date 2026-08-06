'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getSessions } from '@/lib/data';
import { Session, WeightRepsSet } from '@/lib/types';

function DashboardInner() {
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
        if (log.logType === 'weight_reps') map.set(log.exerciseId, log.exerciseName);
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
        const maxWeight = Math.max(0, ...(log.sets as WeightRepsSet[]).map((set) => set.weight));
        return { date: s.date, 'Max. Gewicht (kg)': maxWeight };
      })
      .filter((d): d is { date: string; 'Max. Gewicht (kg)': number } => Boolean(d));
  }, [sessions, selectedExerciseId]);

  return (
    <AppShell title="my-pain">
      <Link
        href="/training"
        className="mb-6 block rounded-lg bg-neutral-900 px-4 py-3 text-center text-base font-medium text-white"
      >
        Training starten
      </Link>

      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}

      {!loading && sessions.length === 0 && (
        <p className="text-sm text-neutral-400">
          Noch keine Trainings geloggt. Starte dein erstes Training, um hier Verläufe zu sehen.
        </p>
      )}

      {!loading && sessions.length > 0 && (
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
      )}
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}
