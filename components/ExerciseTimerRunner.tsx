'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ExerciseTimer, SetEntry } from '@/lib/types';

interface Props {
  timer: ExerciseTimer;
  sets: SetEntry[];
  onSetsChange: (sets: SetEntry[]) => void;
  onActiveChange?: (active: boolean) => void;
}

type Phase = 'work' | 'rest';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

export default function ExerciseTimerRunner({ timer, sets, onSetsChange, onActiveChange }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('work');
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(false);

  const setsRef = useRef(sets);
  setsRef.current = sets;
  const onSetsChangeRef = useRef(onSetsChange);
  onSetsChangeRef.current = onSetsChange;

  useEffect(() => {
    onActiveChange?.(activeIndex !== null);
  }, [activeIndex, onActiveChange]);

  // Countdown: eine Sekunde runterzählen, solange aktiv und nicht pausiert.
  useEffect(() => {
    if (activeIndex === null || paused || remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [activeIndex, paused, remaining]);

  function goToNextSet(current: SetEntry[]) {
    const nextIndex = current.findIndex((s) => !s.completed);
    if (nextIndex === -1) {
      setActiveIndex(null);
      setPhase('work');
      setRemaining(0);
    } else {
      setActiveIndex(nextIndex);
      setPhase('work');
      setRemaining(timer.workSec);
    }
  }

  // Phasenwechsel, sobald der Countdown bei 0 ankommt.
  useEffect(() => {
    if (activeIndex === null || remaining > 0) return;
    vibrate(300);
    if (phase === 'work') {
      const next = setsRef.current.map((s, i) => (i === activeIndex ? { ...s, completed: true } : s));
      onSetsChangeRef.current(next);
      if (timer.restSec > 0) {
        setPhase('rest');
        setRemaining(timer.restSec);
      } else {
        goToNextSet(next);
      }
    } else {
      goToNextSet(setsRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, activeIndex, phase]);

  function start() {
    if (activeIndex !== null) return;
    const startIndex = sets.findIndex((s) => !s.completed);
    if (startIndex === -1) return;
    setActiveIndex(startIndex);
    setPhase('work');
    setRemaining(timer.workSec);
    setPaused(false);
  }

  function stop() {
    setActiveIndex(null);
    setPaused(false);
    setRemaining(0);
  }

  const running = activeIndex !== null;
  const allDone = sets.length === 0 || sets.every((s) => s.completed);

  if (!running) {
    return (
      <button
        onClick={start}
        disabled={allDone}
        className="mt-2 flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-30"
        title={allDone ? 'Alle Sätze erledigt' : 'Timer starten'}
      >
        <span>▶</span>
        {allDone ? 'Alle Sätze erledigt' : `Timer starten (${formatTime(timer.workSec)} Arbeit / ${formatTime(timer.restSec)} Pause)`}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {phase === 'work' ? 'Arbeit' : 'Pause'} · Satz {activeIndex + 1}/{sets.length}
      </p>
      <p
        className={clsx(
          'text-3xl font-semibold tabular-nums',
          phase === 'work' ? 'text-neutral-900' : 'text-emerald-600'
        )}
      >
        {formatTime(remaining)}
      </p>
      <div className="mt-2 flex justify-center gap-2">
        <button
          onClick={() => setPaused((p) => !p)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
        >
          {paused ? 'Weiter' : 'Pause'}
        </button>
        <button
          onClick={() => setRemaining(0)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
        >
          Überspringen
        </button>
        <button onClick={stop} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-red-600">
          Stopp
        </button>
      </div>
    </div>
  );
}
