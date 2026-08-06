'use client';

import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getSessions } from '@/lib/data';
import { Session, CATEGORY_LABELS, WeightRepsSet, TimeSet } from '@/lib/types';

function HistoryInner() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getSessions(user.uid)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <AppShell title="Verlauf">
      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}
      {!loading && sessions.length === 0 && (
        <p className="text-sm text-neutral-400">Noch keine Trainings geloggt.</p>
      )}

      <div className="space-y-2">
        {sessions.map((s) => {
          const open = openId === s.id;
          return (
            <div key={s.id} className="rounded-lg border border-neutral-200">
              <button
                onClick={() => setOpenId(open ? null : s.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="font-medium">{s.sourceName}</p>
                  <p className="text-sm text-neutral-500">
                    {s.date} · {CATEGORY_LABELS[s.category]}
                  </p>
                </div>
                <span className="text-sm text-neutral-500">Schmerz {s.preSurvey.painLevel}/10</span>
              </button>

              {open && (
                <div className="border-t border-neutral-200 px-4 py-3 text-sm">
                  <p className="mb-2 text-neutral-500">
                    Schmerzregion: {s.preSurvey.painRegion || '–'} · Schlaf: {s.preSurvey.sleepHours}h ·
                    Stimmung: {s.preSurvey.mood}/10
                  </p>
                  <ul className="space-y-1">
                    {s.exerciseLogs.map((log) => (
                      <li key={log.exerciseId}>
                        <span className="font-medium">{log.exerciseName}:</span>{' '}
                        {log.logType === 'time'
                          ? (log.sets as TimeSet[]).map((set) => `${set.durationSec}s`).join(', ')
                          : (log.sets as WeightRepsSet[])
                              .map((set) => `${set.weight}kg×${set.reps}`)
                              .join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

export default function HistoryPage() {
  return (
    <RequireAuth>
      <HistoryInner />
    </RequireAuth>
  );
}
