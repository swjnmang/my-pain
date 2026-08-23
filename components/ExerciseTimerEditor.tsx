'use client';

import { useEffect, useState } from 'react';
import { ExerciseTimer } from '@/lib/types';

interface Props {
  value?: ExerciseTimer;
  onChange: (timer: ExerciseTimer | undefined) => void;
}

const DEFAULT_TIMER: ExerciseTimer = { workSec: 30, restSec: 30 };

export default function ExerciseTimerEditor({ value, onChange }: Props) {
  const enabled = Boolean(value);

  const [workInput, setWorkInput] = useState(String(value?.workSec ?? DEFAULT_TIMER.workSec));
  const [restInput, setRestInput] = useState(String(value?.restSec ?? DEFAULT_TIMER.restSec));

  // Eingabefelder mit dem Wert des Elternteils synchronisieren, z.B. nach dem Laden
  // einer bestehenden Übung oder wenn der Timer ein-/ausgeschaltet wird.
  useEffect(() => {
    setWorkInput(String(value?.workSec ?? DEFAULT_TIMER.workSec));
    setRestInput(String(value?.restSec ?? DEFAULT_TIMER.restSec));
  }, [value?.workSec, value?.restSec]);

  function toggle(next: boolean) {
    onChange(next ? DEFAULT_TIMER : undefined);
  }

  function handleWorkChange(raw: string) {
    setWorkInput(raw);
    if (!value) return;
    const parsed = Number(raw);
    if (raw.trim() !== '' && Number.isFinite(parsed)) {
      onChange({ ...value, workSec: parsed });
    }
  }

  function handleWorkBlur() {
    if (!value) return;
    const parsed = Number(workInput);
    const clamped = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
    setWorkInput(String(clamped));
    onChange({ ...value, workSec: clamped });
  }

  function handleRestChange(raw: string) {
    setRestInput(raw);
    if (!value) return;
    const parsed = Number(raw);
    if (raw.trim() !== '' && Number.isFinite(parsed)) {
      onChange({ ...value, restSec: parsed });
    }
  }

  function handleRestBlur() {
    if (!value) return;
    const parsed = Number(restInput);
    const clamped = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
    setRestInput(String(clamped));
    onChange({ ...value, restSec: clamped });
  }

  return (
    <div>
      <label className="mb-1 flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => toggle(e.target.checked)}
          className="h-4 w-4 accent-neutral-900"
        />
        Timer für diese Übung
      </label>
      {enabled && value && (
        <div className="mt-2 flex gap-3 rounded-lg border border-neutral-200 p-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-neutral-500">Arbeitsphase (Sek.)</label>
            <input
              type="number"
              min={0}
              value={workInput}
              onChange={(e) => handleWorkChange(e.target.value)}
              onBlur={handleWorkBlur}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-neutral-500">Pause (Sek.)</label>
            <input
              type="number"
              min={0}
              value={restInput}
              onChange={(e) => handleRestChange(e.target.value)}
              onBlur={handleRestBlur}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </div>
        </div>
      )}
    </div>
  );
}
