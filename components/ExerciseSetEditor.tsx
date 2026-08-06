'use client';

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
}

function formatSets(logType: LogType, sets: WeightRepsSet[] | TimeSet[]): string {
  if (logType === 'time') {
    return (sets as TimeSet[]).map((s) => `${s.durationSec}s`).join(', ');
  }
  return (sets as WeightRepsSet[]).map((s) => `${s.weight}kg × ${s.reps}`).join(', ');
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
}: Props) {
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
      <p className="font-medium">{name}</p>

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

      <div className="mt-3 space-y-2">
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
