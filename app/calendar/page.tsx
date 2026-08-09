'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import {
  getSessions,
  getPlannedTrainings,
  getWorkoutTemplates,
  getUserWorkouts,
  createPlannedTraining,
  createRecurringPlannedTrainings,
  deletePlannedTraining,
  movePlannedTraining,
  deleteSession,
} from '@/lib/data';
import { Session, PlannedTraining, WorkoutTemplate, Workout, Category, CATEGORY_LABELS } from '@/lib/types';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];
const CATEGORIES: Category[] = ['oberkoerper', 'unterkoerper', 'ganzkoerper', 'warmup'];

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

type GridCell = { type: 'pad' } | { type: 'day'; day: number; key: string };
type ViewMode = 'list' | 'week' | 'month';
type RepeatMode = 'once' | 'daily' | 'every2' | 'weekly' | 'custom';

const REPEAT_INTERVAL_DAYS: Partial<Record<RepeatMode, number>> = {
  daily: 1,
  every2: 2,
  weekly: 7,
};

function buildMonthGrid(year: number, month: number): GridCell[] {
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mo=0 .. So=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: GridCell[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ type: 'pad' });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ type: 'day', day: d, key: dateKey(year, month, d) });
  while (cells.length % 7 !== 0) cells.push({ type: 'pad' });
  return cells;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const weekday = (d.getDay() + 6) % 7; // Mo=0 .. So=6
  d.setDate(d.getDate() - weekday);
  return d;
}

function getWeekLabel(anchor: Date): string {
  const monday = getMonday(anchor);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const startLabel =
    monday.getMonth() === sunday.getMonth()
      ? `${monday.getDate()}.`
      : `${monday.getDate()}. ${MONTH_NAMES[monday.getMonth()]}`;
  return `Woche vom ${startLabel} bis ${sunday.getDate()}. ${MONTH_NAMES[sunday.getMonth()]}`;
}

function buildWeekGrid(anchor: Date): GridCell[] {
  const monday = getMonday(anchor);
  const cells: GridCell[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    cells.push({ type: 'day', day: d.getDate(), key: dateKey(d.getFullYear(), d.getMonth(), d.getDate()) });
  }
  return cells;
}

function CalendarInner() {
  const { user } = useAuth();
  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [anchorDate, setAnchorDate] = useState(today);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [planned, setPlanned] = useState<PlannedTraining[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [ownWorkouts, setOwnWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pickerCategory, setPickerCategory] = useState<Category>('ganzkoerper');
  const [busy, setBusy] = useState(false);
  const [movingPlanId, setMovingPlanId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState('');
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('once');
  const [customDays, setCustomDays] = useState(3);

  function reload() {
    if (!user) return;
    return Promise.all([
      getSessions(user.uid),
      getPlannedTrainings(user.uid),
      getWorkoutTemplates(),
      getUserWorkouts(user.uid),
    ]).then(([s, p, t, w]) => {
      setSessions(s);
      setPlanned(p);
      setTemplates(t);
      setOwnWorkouts(w);
    });
  }

  useEffect(() => {
    if (!user) return;
    reload()
      ?.catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    setRepeatMode('once');
  }, [selectedKey]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [sessions]);

  const plannedByDate = useMemo(() => {
    const map = new Map<string, PlannedTraining>();
    for (const p of planned) map.set(p.date, p);
    return map;
  }, [planned]);

  const monthCells = useMemo(
    () => buildMonthGrid(anchorDate.getFullYear(), anchorDate.getMonth()),
    [anchorDate]
  );
  const weekCells = useMemo(() => buildWeekGrid(anchorDate), [anchorDate]);

  const listItems = useMemo(() => {
    const items = [
      ...sessions.map((s) => ({ key: s.date, sourceName: s.sourceName, category: s.category, status: 'done' as const })),
      ...planned.map((p) => ({ key: p.date, sourceName: p.sourceName, category: p.category, status: 'planned' as const })),
    ];
    return items.sort((a, b) => a.key.localeCompare(b.key));
  }, [sessions, planned]);

  function goToPrevious() {
    setSelectedKey(null);
    setAnchorDate((d) => {
      if (viewMode === 'week') {
        const nd = new Date(d);
        nd.setDate(nd.getDate() - 7);
        return nd;
      }
      return new Date(d.getFullYear(), d.getMonth() - 1, 1);
    });
  }

  function goToNext() {
    setSelectedKey(null);
    setAnchorDate((d) => {
      if (viewMode === 'week') {
        const nd = new Date(d);
        nd.setDate(nd.getDate() + 7);
        return nd;
      }
      return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    });
  }

  async function handlePlan(source: WorkoutTemplate | Workout, sourceType: 'template' | 'workout') {
    if (!user || !selectedKey) return;
    setBusy(true);
    try {
      const plannedData = {
        date: selectedKey,
        sourceType,
        sourceId: source.id,
        sourceName: source.name,
        category: source.category,
        createdAt: Date.now(),
      };
      const intervalDays = REPEAT_INTERVAL_DAYS[repeatMode] ?? (repeatMode === 'custom' ? customDays : undefined);
      if (intervalDays) {
        await createRecurringPlannedTrainings(user.uid, plannedData, intervalDays);
      } else {
        await createPlannedTraining(user.uid, plannedData);
      }
      setRepeatMode('once');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Planen fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePlan(planId: string) {
    if (!user) return;
    setBusy(true);
    try {
      await deletePlannedTraining(user.uid, planId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  async function handleMovePlan(planId: string) {
    if (!user || !moveDate) return;
    setBusy(true);
    try {
      await movePlannedTraining(user.uid, planId, moveDate);
      setMovingPlanId(null);
      setSelectedKey(moveDate);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verschieben fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!user) return;
    if (!window.confirm('Dieses Training wirklich löschen?')) return;
    setBusy(true);
    try {
      await deleteSession(user.uid, sessionId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  const selectedSessions = selectedKey ? sessionsByDate.get(selectedKey) ?? [] : [];
  const selectedPlan = selectedKey ? plannedByDate.get(selectedKey) : undefined;
  const isStrictlyFuture = selectedKey ? selectedKey > todayKey : false;

  const filteredTemplates = templates.filter((t) => t.category === pickerCategory);
  const filteredOwn = ownWorkouts.filter((w) => w.category === pickerCategory);

  return (
    <AppShell title="Kalender">
      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {!loading && (
        <>
          <div className="mb-4 flex gap-2">
            {(['list', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode);
                  setSelectedKey(null);
                }}
                className={clsx(
                  'flex-1 rounded-full px-3 py-1.5 text-sm',
                  viewMode === mode ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
                )}
              >
                {mode === 'list' ? 'Liste' : mode === 'week' ? 'Woche' : 'Monat'}
              </button>
            ))}
          </div>

          {viewMode !== 'list' && (
            <div className="mb-4 flex items-center justify-between">
              <button onClick={goToPrevious} className="px-2 py-1 text-lg">
                ‹
              </button>
              <p className="font-medium">
                {viewMode === 'month'
                  ? `${MONTH_NAMES[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`
                  : getWeekLabel(anchorDate)}
              </p>
              <button onClick={goToNext} className="px-2 py-1 text-lg">
                ›
              </button>
            </div>
          )}

          {viewMode !== 'list' && (
            <>
              <div className="mb-1 grid grid-cols-7 text-center text-xs text-neutral-400">
                {WEEKDAYS.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>

              <div className="mb-6 grid grid-cols-7 gap-1">
                {(viewMode === 'month' ? monthCells : weekCells).map((cell, i) => {
                  if (cell.type === 'pad') return <div key={i} />;
                  const hasSession = sessionsByDate.has(cell.key);
                  const hasPlan = plannedByDate.has(cell.key);
                  const isToday = cell.key === todayKey;
                  const isSelected = cell.key === selectedKey;
                  return (
                    <button
                      key={cell.key}
                      onClick={() => setSelectedKey(cell.key)}
                      className={clsx(
                        'flex aspect-square flex-col items-center justify-center rounded-lg text-sm',
                        isSelected ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100',
                        isToday && !isSelected && 'border border-neutral-900'
                      )}
                    >
                      <span>{cell.day}</span>
                      <span className="mt-0.5 flex gap-0.5">
                        {hasSession && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                        {hasPlan && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === 'list' && (
            <div className="mb-6 space-y-2">
              {listItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedKey(item.key)}
                  className={clsx(
                    'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left',
                    item.key === selectedKey ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
                  )}
                >
                  <div>
                    <p className="font-medium">{item.sourceName}</p>
                    <p className="text-sm text-neutral-500">
                      {item.key} · {CATEGORY_LABELS[item.category]}
                    </p>
                  </div>
                  <span className={clsx('h-2 w-2 rounded-full', item.status === 'done' ? 'bg-green-500' : 'bg-blue-500')} />
                </button>
              ))}
              {listItems.length === 0 && <p className="text-sm text-neutral-400">Noch keine Trainings.</p>}
            </div>
          )}

          {selectedKey && (
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="mb-3 font-medium">{selectedKey}</p>

              {selectedSessions.length > 0 && (
                <div className="mb-4 space-y-2">
                  {selectedSessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Link
                        href={`/session/edit/${s.id}`}
                        className="block flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      >
                        <p className="font-medium">{s.sourceName}</p>
                        <p className="text-neutral-500">
                          {CATEGORY_LABELS[s.category]} · Schmerz {s.preSurvey.painLevel}/10 · bearbeiten
                        </p>
                      </Link>
                      <button
                        onClick={() => handleDeleteSession(s.id)}
                        disabled={busy}
                        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-red-600"
                        title="Training löschen"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedPlan && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <p className="font-medium">{selectedPlan.sourceName}</p>
                  <p className="mb-2 text-sm text-neutral-500">{CATEGORY_LABELS[selectedPlan.category]} · geplant</p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/session/new?type=${selectedPlan.sourceType}&id=${selectedPlan.sourceId}&date=${selectedPlan.date}&planId=${selectedPlan.id}`}
                      className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white"
                    >
                      Jetzt starten
                    </Link>
                    {selectedPlan.sourceType === 'workout' && (
                      <Link
                        href={`/training/edit/${selectedPlan.sourceId}`}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
                      >
                        Bearbeiten
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setMovingPlanId(selectedPlan.id);
                        setMoveDate(selectedPlan.date);
                      }}
                      disabled={busy}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
                    >
                      Verschieben
                    </button>
                    <button
                      onClick={() => handleDeletePlan(selectedPlan.id)}
                      disabled={busy}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
                    >
                      Löschen
                    </button>
                  </div>

                  {movingPlanId === selectedPlan.id && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="date"
                        value={moveDate}
                        onChange={(e) => setMoveDate(e.target.value)}
                        className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => handleMovePlan(selectedPlan.id)}
                        disabled={busy || !moveDate}
                        className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                      >
                        Bestätigen
                      </button>
                      <button onClick={() => setMovingPlanId(null)} className="text-sm text-neutral-500 underline">
                        Abbrechen
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedSessions.length === 0 && !selectedPlan && (
                <div>
                  <p className="mb-2 text-sm text-neutral-500">
                    {isStrictlyFuture ? 'Training für diesen Tag planen' : 'Training für diesen Tag nachtragen'}
                  </p>

                  {isStrictlyFuture && (
                    <div className="mb-3">
                      <label className="mb-1 block text-xs font-medium text-neutral-500">Wiederholen</label>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            ['once', 'Einmalig'],
                            ['daily', 'Täglich'],
                            ['every2', 'Alle 2 Tage'],
                            ['weekly', 'Wöchentlich'],
                            ['custom', 'Alle X Tage'],
                          ] as [RepeatMode, string][]
                        ).map(([mode, label]) => (
                          <button
                            key={mode}
                            onClick={() => setRepeatMode(mode)}
                            className={clsx(
                              'rounded-full px-2 py-1 text-xs',
                              repeatMode === mode ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {repeatMode === 'custom' && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={customDays}
                            onChange={(e) => setCustomDays(Math.max(1, Number(e.target.value)))}
                            className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                          />
                          <span className="text-sm text-neutral-500">Tage Rhythmus</span>
                        </div>
                      )}
                      {repeatMode !== 'once' && (
                        <p className="mt-1 text-xs text-neutral-400">
                          Erstellt die nächsten 12 Termine in diesem Rhythmus.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mb-3 flex gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setPickerCategory(c)}
                        className={clsx(
                          'flex-1 rounded-full px-2 py-1 text-xs',
                          pickerCategory === c ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
                        )}
                      >
                        {CATEGORY_LABELS[c]}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {filteredOwn.map((w) => (
                      <div key={w.id} className="flex items-center gap-2">
                        {isStrictlyFuture ? (
                          <button
                            disabled={busy}
                            onClick={() => handlePlan(w, 'workout')}
                            className="block flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm"
                          >
                            {w.name}
                          </button>
                        ) : (
                          <Link
                            href={`/session/new?type=workout&id=${w.id}&date=${selectedKey}`}
                            className="block flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                          >
                            {w.name}
                          </Link>
                        )}
                        <Link
                          href={`/training/edit/${w.id}`}
                          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                          title="Training bearbeiten"
                        >
                          ✎
                        </Link>
                      </div>
                    ))}
                    {filteredTemplates.map((t) =>
                      isStrictlyFuture ? (
                        <button
                          key={t.id}
                          disabled={busy}
                          onClick={() => handlePlan(t, 'template')}
                          className="block w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm"
                        >
                          {t.name}
                        </button>
                      ) : (
                        <Link
                          key={t.id}
                          href={`/session/new?type=template&id=${t.id}&date=${selectedKey}`}
                          className="block rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                        >
                          {t.name}
                        </Link>
                      )
                    )}
                    {filteredTemplates.length === 0 && filteredOwn.length === 0 && (
                      <p className="text-sm text-neutral-400">Keine Trainings in dieser Kategorie.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

export default function CalendarPage() {
  return (
    <RequireAuth>
      <CalendarInner />
    </RequireAuth>
  );
}
