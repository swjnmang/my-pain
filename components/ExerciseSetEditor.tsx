'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogType, WeightRepsSet, TimeSet } from '@/lib/types';

interface Props {
  name: string;
  logType: LogType;
  sets: WeightRepsSet[] | TimeSet[];
  onChange: (sets: WeightRepsSet[] | TimeSet[]) => void;
  videoUrl?: string;
  images?: string[];
  previousSets?: WeightRepsSet[] | TimeSet[];
  note?: string;
  editHref?: string;
  onRemove?: () => void;
}

type TimeUnit = 'sec' | 'min';

function formatSets(logType: LogType, sets: WeightRepsSet[] | TimeSet[]): string {
  if (logType === 'time') {
    return (sets as TimeSet[]).map((s) => `${s.durationSec}s`).join(', ');
  }
  return (sets as WeightRepsSet[]).map((s) => `${s.reps} × ${s.weight}kg`).join(', ');
}

export default function ExerciseSetEditor({
  name,
  logType,
  sets,
  onChange,
  videoUrl,
  images,
  previousSets,
  note,
  editHref,
  onRemove,
}: Props) {
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('sec');

  function addSet() {
    const newSet = logType === 'time' ? { durationSec: 0 } : { weight: 0, reps: 0 };
    onChange([...sets, newSet] as WeightRepsSet[] | TimeSet[]);
  }

  function updateSet(index: number, field: string, value: number) {
    const next = [...sets] as unknown as Record<string, number>[];
    next[index] = { ...next[index], [field]: value };
    onChange(next as unknown as WeightRepsSet[] | TimeSet[]);
  }

  function updateDuration(index: number, displayValue: number) {
    const durationSec = timeUnit === 'min' ? displayValue * 60 : displayValue;
    updateSet(index, 'durationSec', durationSec);
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{name}</p>
        {(editHref || onRemove) && (
          <div className="flex shrink-0 items-center gap-1">
            {editHref && (
              <Link
                href={editHref}
                className="rounded-lg border border-neutral-200 px-2 py-1 text-xs"
                title="Übung bearbeiten"
              >
                ✎
              </Link>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-red-600"
                title="Übung aus Training entfernen"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {note && (
        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">{note}</p>
      )}

      {(videoUrl || (images && images.length > 0)) && (
        <div className="mt-2 flex items-center gap-2">
          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 underline"
            >
              ▶ Video ansehen
            </a>
          )}
          {images?.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="h-10 w-10 rounded object-cover" />
          ))}
        </div>
      )}

      {previousSets && previousSets.length > 0 && (
        <p className="mt-2 text-xs text-neutral-400">Letztes Mal: {formatSets(logType, previousSets)}</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <span className="w-6" />
        {logType === 'weight_reps' ? (
          <>
            <span className="flex-1 text-xs font-medium text-neutral-500">Anzahl der Wiederholungen</span>
            <span className="flex-1 text-xs font-medium text-neutral-500">Gewicht/Zeit (kg)</span>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Gewicht/Zeit</span>
            <select
              value={timeUnit}
              onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
              className="rounded border border-neutral-300 px-1 py-0.5 text-xs"
            >
              <option value="sec">Sekunden</option>
              <option value="min">Minuten</option>
            </select>
          </div>
        )}
      </div>

      <div className="mt-1 space-y-2">
        {sets.map((set, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-sm text-neutral-400">{i + 1}.</span>
            {logType === 'time' ? (
              <input
                type="number"
                min={0}
                step={timeUnit === 'min' ? 0.1 : 1}
                placeholder={timeUnit === 'min' ? 'Minuten' : 'Sekunden'}
                value={
                  (set as TimeSet).durationSec
                    ? timeUnit === 'min'
                      ? (set as TimeSet).durationSec / 60
                      : (set as TimeSet).durationSec
                    : ''
                }
                onChange={(e) => updateDuration(i, Number(e.target.value))}
                className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm sm:px-3 sm:py-2 sm:text-base"
              />
            ) : (
              <>
                <input
                  type="number"
                  min={0}
                  placeholder="Wdh."
                  value={(set as WeightRepsSet).reps || ''}
                  onChange={(e) => updateSet(i, 'reps', Number(e.target.value))}
                  className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm sm:px-3 sm:py-2 sm:text-base"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="kg"
                  value={(set as WeightRepsSet).weight || ''}
                  onChange={(e) => updateSet(i, 'weight', Number(e.target.value))}
                  className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm sm:px-3 sm:py-2 sm:text-base"
                />
              </>
            )}
          </div>
        ))}
      </div>
      <button onClick={addSet} className="mt-3 text-sm text-neutral-500 underline">
        + Satz hinzufügen
      </button>
    </div>
  );
}
