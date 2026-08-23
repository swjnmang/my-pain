'use client';

import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import SwipeToDelete from '@/components/SwipeToDelete';
import { useAuth } from '@/lib/AuthContext';
import { getSessions, deleteSession } from '@/lib/data';
import { formatSets } from '@/lib/columns';
import { groupLogsByBlock } from '@/lib/blocks';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getSessions(user.uid)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [user]);

  async function handleDeleteSession(sessionId: string) {
    if (!user) return;
    setError(null);
    try {
      await deleteSession(user.uid, sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setOpenId((prev) => (prev === sessionId ? null : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.');
    }
  }

  return (
    <AppShell title="Verlauf">
      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {!loading && sessions.length === 0 && (
        <p className="text-sm text-neutral-400">Noch keine Trainings geloggt.</p>
      )}

      <div className="space-y-2">
        {sessions.map((s) => {
          const open = openId === s.id;
          return (
            <SwipeToDelete key={s.id} onDelete={() => handleDeleteSession(s.id)}>
              <div className="rounded-lg border border-neutral-200">
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
                    {(() => {
                      const groups = groupLogsByBlock(s.exerciseLogs);
                      const showHeaders = groups.length > 1;
                      return (
                        <div className="space-y-2">
                          {groups.map((group, gi) => (
                            <div key={group.blockId ?? `group-${gi}`}>
                              {showHeaders && group.blockName && (
                                <p className="mb-1 text-xs font-semibold text-neutral-500">{group.blockName}</p>
                              )}
                              <ul className="space-y-1">
                                {group.logs.map((log) => (
                                  <li key={log.exerciseId}>
                                    <span className="font-medium">{log.exerciseName}:</span>{' '}
                                    {formatSets(log.columns, log.sets)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </SwipeToDelete>
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
