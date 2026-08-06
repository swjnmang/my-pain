'use client';

import { LogType, WeightRepsSet, TimeSet } from '@/lib/types';

interface Props {
  name: string;
  logType: LogType;
  sets: WeightRepsSet[] | TimeSet[];
  onChange: (sets: WeightRepsSet[] | TimeSet[]) => void;
}

export default function ExerciseSetEditor({ name, logType, sets, onChange }: Props) {
  function addSet() {
    const newSet = logType === 'time' ? { durationSec: 0 } : { weight: 0, reps: 0 };
    onChange([...sets, newSet] as WeightRepsSet[] | TimeSet[]);
  }

  function updateSet(index: number, field: string, value: number) {
    const next = [...sets] as unknown as Record<string, number>[];
    next[index] = { ...next[index], [field]: value };
    onChange(next as unknown as WeightRepsSet[] | TimeSet[]);
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="mb-3 font-medium">{name}</p>
      <div className="space-y-2">
        {sets.map((set, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-sm text-neutral-400">{i + 1}.</span>
            {logType === 'time' ? (
              <input
                type="number"
                min={0}
                placeholder="Sekunden"
                value={(set as TimeSet).durationSec || ''}
                onChange={(e) => updateSet(i, 'durationSec', Number(e.target.value))}
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-base"
              />
            ) : (
              <>
                <input
                  type="number"
                  min={0}
                  placeholder="kg"
                  value={(set as WeightRepsSet).weight || ''}
                  onChange={(e) => updateSet(i, 'weight', Number(e.target.value))}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-base"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Wdh."
                  value={(set as WeightRepsSet).reps || ''}
                  onChange={(e) => updateSet(i, 'reps', Number(e.target.value))}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-base"
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
