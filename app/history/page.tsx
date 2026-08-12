'use client';

import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getSessions } from '@/lib/data';
import { formatSets } from '@/lib/columns';
import { Session, CATEGORY_LABELS } from '@/lib/types';

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

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
                    {s.durationSec !== undefined ? ` · ${formatDuration(s.durationSec)}` : ''}
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
                        {formatSets(log.columns, log.sets)}
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
