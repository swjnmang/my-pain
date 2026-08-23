'use client';

import { ExerciseTimer } from '@/lib/types';

interface Props {
  value?: ExerciseTimer;
  onChange: (timer: ExerciseTimer | undefined) => void;
}

const DEFAULT_TIMER: ExerciseTimer = { workSec: 30, restSec: 30 };

export default function ExerciseTimerEditor({ value, onChange }: Props) {
  const enabled = Boolean(value);

  function toggle(next: boolean) {
    onChange(next ? DEFAULT_TIMER : undefined);
  }

  function update(patch: Partial<ExerciseTimer>) {
    if (!value) return;
    onChange({ ...value, ...patch });
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
              min={1}
              value={value.workSec}
              onChange={(e) => update({ workSec: Math.max(1, Number(e.target.value)) })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-neutral-500">Pause (Sek.)</label>
            <input
              type="number"
              min={0}
              value={value.restSec}
              onChange={(e) => update({ restSec: Math.max(0, Number(e.target.value)) })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </div>
        </div>
      )}
    </div>
  );
}
