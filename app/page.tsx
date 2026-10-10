'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getActiveSessionDraft, clearActiveSessionDraft, ActiveSessionDraft } from '@/lib/activeSession';
import { getPlannedTrainings, getSessions } from '@/lib/data';
import { CATEGORY_LABELS, PlannedTraining, Session } from '@/lib/types';

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatElapsed(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

function lastSevenDays(sessions: Session[]) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const key = dateKey(d);
    const daySessions = sessions.filter((s) => s.date === key);
    const pain = daySessions.length > 0 ? Math.max(...daySessions.map((s) => s.preSurvey.painLevel)) : null;
    return { key, label: WEEKDAYS[d.getDay()], pain, isToday: i === 6 };
  });
}

function DashboardInner() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<ActiveSessionDraft | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [nextPlan, setNextPlan] = useState<PlannedTraining | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!user) return;
    setDraft(getActiveSessionDraft(user.uid));
    getSessions(user.uid).then(setSessions).catch(() => {});
    getPlannedTrainings(user.uid)
      .then((plans) => {
        const todayKey = dateKey(new Date());
        const upcoming = plans.filter((p) => p.date >= todayKey).sort((a, b) => a.date.localeCompare(b.date));
        setNextPlan(upcoming[0] ?? null);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!draft) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [draft]);

  const resumeHref = draft
    ? `/session/new?type=${draft.type}&id=${draft.id}&date=${draft.date}${draft.planId ? `&planId=${draft.planId}` : ''}`
    : '';

  const days = lastSevenDays(sessions);
  const todayLabel = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const planDate = nextPlan ? new Date(`${nextPlan.date}T00:00:00`) : null;

  return (
    <AppShell title="my-pain">
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-500">{todayLabel}</p>
          <h2 className="text-[28px] font-bold leading-tight tracking-tight">
            Wie fühlt sich dein Körper heute an?
          </h2>
        </div>

        {draft && (
          <div className="space-y-3.5 rounded-2xl bg-accent p-[18px] text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium text-accent-soft">Laufendes Training</p>
                <p className="text-[19px] font-bold">{draft.sourceName}</p>
              </div>
              {draft.startedAt > 0 && (
                <p className="text-[22px] font-semibold tabular-nums">
                  {formatElapsed(Math.max(0, Math.floor((now - draft.startedAt) / 1000)))}
                </p>
              )}
            </div>
            <div className="flex gap-2.5">
              <Link
                href={resumeHref}
                className="flex h-12 flex-1 items-center justify-center rounded-xl bg-white text-[15px] font-bold text-accent-dark"
              >
                Fortsetzen
              </Link>
              <button
                onClick={() => {
                  if (!user) return;
                  clearActiveSessionDraft(user.uid);
                  setDraft(null);
                }}
                className="h-12 rounded-xl border border-white/50 px-4 text-[15px] font-medium"
              >
                Verwerfen
              </button>
            </div>
          </div>
        )}

        <Link href="/history" className="block space-y-3.5 rounded-2xl bg-white p-[18px]">
          <div className="flex items-baseline justify-between">
            <p className="text-base font-bold">Letzte 7 Tage</p>
            <p className="text-[13px] text-neutral-500">Schmerz 0–10</p>
          </div>
          <div className="grid h-[84px] grid-cols-7 items-end gap-1.5">
            {days.map((d) => (
              <div key={d.key} className="flex flex-col items-center gap-1.5">
                <div
                  className={clsx(
                    'w-full rounded-lg',
                    d.pain === null
                      ? 'bg-neutral-100'
                      : d.isToday
                        ? 'bg-accent'
                        : d.pain >= 4
                          ? 'bg-pain-soft'
                          : 'bg-accent-soft'
                  )}
                  style={{ height: d.pain === null ? 6 : 10 + d.pain * 5 }}
                  title={d.pain === null ? 'Kein Training' : `Schmerz ${d.pain}/10`}
                />
                <span className={clsx('text-xs', d.isToday ? 'font-bold text-neutral-900' : 'text-neutral-500')}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </Link>

        <Link
          href="/training"
          className="flex h-14 items-center justify-center gap-2.5 rounded-xl bg-neutral-900 text-[17px] font-bold text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 4l12 8-12 8z" />
          </svg>
          Training starten
        </Link>

        <div className="space-y-2.5">
          <p className="text-base font-bold">Als Nächstes</p>
          {nextPlan && planDate ? (
            <Link href="/calendar" className="flex items-center gap-3.5 rounded-xl bg-white px-4 py-3.5">
              <div className="flex h-[46px] w-[46px] flex-col items-center justify-center rounded-lg bg-accent-soft text-accent-dark">
                <span className="text-[11px] font-semibold uppercase">{WEEKDAYS[planDate.getDay()]}</span>
                <span className="text-[17px] font-bold leading-none">{planDate.getDate()}</span>
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold">{nextPlan.sourceName}</p>
                <p className="text-[13px] text-neutral-500">{CATEGORY_LABELS[nextPlan.category]}</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          ) : (
            <Link
              href="/calendar"
              className="block rounded-xl border border-dashed border-neutral-300 px-4 py-3.5 text-center text-sm font-semibold text-accent"
            >
              + Training planen
            </Link>
          )}
          <Link
            href="/history"
            className="block rounded-xl bg-white px-4 py-3.5 text-[15px] font-semibold"
          >
            Meine letzten Trainings
          </Link>
        </div>
      </div>
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
