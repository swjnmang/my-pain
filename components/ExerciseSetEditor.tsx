'use client';

import { useState } from 'react';
import Link from 'next/link';
import ImageLightbox from './ImageLightbox';
import { Column, SetEntry, UNIT_LABELS, UnitKey } from '@/lib/types';
import { columnLabel, emptySetValues, formatSets, makeColumnId } from '@/lib/columns';

interface Props {
  name: string;
  columns: Column[];
  sets: SetEntry[];
  onChange: (sets: SetEntry[]) => void;
  onColumnsChange?: (columns: Column[]) => void;
  onValueCommit?: (columnId: string, value: number) => void;
  videoUrl?: string;
  images?: string[];
  previousSets?: SetEntry[];
  previousColumns?: Column[];
  note?: string;
  editHref?: string;
  onRemove?: () => void;
  comment?: string;
  onCommentChange?: (comment: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMove?: (direction: 'up' | 'down') => void;
}

type TimeUnit = 'sec' | 'min';

const UNIT_ORDER: UnitKey[] = ['kg', 'reps', 'time', 'distance_m', 'rpe'];

export default function ExerciseSetEditor({
  name,
  columns,
  sets,
  onChange,
  onColumnsChange,
  onValueCommit,
  videoUrl,
  images,
  previousSets,
  previousColumns,
  note,
  editHref,
  onRemove,
  comment,
  onCommentChange,
  canMoveUp,
  canMoveDown,
  onMove,
}: Props) {
  const [timeUnits, setTimeUnits] = useState<Record<string, TimeUnit>>({});
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  function timeUnitFor(columnId: string): TimeUnit {
    return timeUnits[columnId] ?? 'sec';
  }

  function setTimeUnitFor(columnId: string, unit: TimeUnit) {
    setTimeUnits((prev) => ({ ...prev, [columnId]: unit }));
  }

  function addSet() {
    onChange([...sets, { values: emptySetValues(columns) }]);
  }

  function updateSetValue(index: number, columnId: string, value: number) {
    const next = [...sets];
    for (let i = index; i < next.length; i++) {
      next[i] = { ...next[i], values: { ...next[i].values, [columnId]: value } };
    }
    onChange(next);
  }

  function updateSetCompleted(index: number, completed: boolean) {
    const next = [...sets];
    next[index] = { ...next[index], completed };
    onChange(next);
  }

  function updateDuration(index: number, columnId: string, displayValue: number) {
    const durationSec = timeUnitFor(columnId) === 'min' ? displayValue * 60 : displayValue;
    updateSetValue(index, columnId, durationSec);
  }

  function addColumn(unit: UnitKey) {
    const newColumn: Column = {
      id: makeColumnId(),
      unit,
      ...(newColumnLabel.trim() ? { label: newColumnLabel.trim() } : {}),
    };
    onColumnsChange?.([...columns, newColumn]);
    onChange(sets.map((s) => ({ ...s, values: { ...s.values, [newColumn.id]: 0 } })));
    setAddingColumn(false);
    setNewColumnLabel('');
  }

  function removeColumn(columnId: string) {
    if (columns.length <= 1) return;
    onColumnsChange?.(columns.filter((c) => c.id !== columnId));
    onChange(
      sets.map((s) => {
        const values = { ...s.values };
        delete values[columnId];
        return { ...s, values };
      })
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{name}</p>
        {(onMove || editHref || onRemove) && (
          <div className="flex shrink-0 items-center gap-1">
            {onMove && (
              <>
                <button
                  onClick={() => onMove('up')}
                  disabled={!canMoveUp}
                  className="rounded-lg border border-neutral-200 px-2 py-1 text-xs disabled:opacity-30"
                  title="Nach oben verschieben"
                >
                  ▲
                </button>
                <button
                  onClick={() => onMove('down')}
                  disabled={!canMoveDown}
                  className="rounded-lg border border-neutral-200 px-2 py-1 text-xs disabled:opacity-30"
                  title="Nach unten verschieben"
                >
                  ▼
                </button>
              </>
            )}
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
            <img
              key={i}
              src={src}
              alt=""
              onClick={() => setZoomSrc(src)}
              className="h-10 w-10 cursor-pointer rounded object-cover"
            />
          ))}
        </div>
      )}

      {previousSets && previousSets.length > 0 && (
        <p className="mt-2 text-xs text-neutral-400">
          Letztes Mal: {formatSets(previousColumns ?? columns, previousSets)}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <span className="w-6" />
        {columns.map((col) => (
          <div key={col.id} className="flex flex-1 items-center justify-between gap-1">
            <span className="text-xs font-medium text-neutral-500">{columnLabel(col)}</span>
            <div className="flex items-center gap-1">
              {col.unit === 'time' && (
                <select
                  value={timeUnitFor(col.id)}
                  onChange={(e) => setTimeUnitFor(col.id, e.target.value as TimeUnit)}
                  className="rounded border border-neutral-300 px-1 py-0.5 text-xs"
                >
                  <option value="sec">Sek.</option>
                  <option value="min">Min.</option>
                </select>
              )}
              {onColumnsChange && columns.length > 1 && (
                <button
                  onClick={() => removeColumn(col.id)}
                  className="text-xs text-neutral-400"
                  title="Spalte entfernen"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
        <span className="w-5 shrink-0" />
      </div>

      <div className="mt-1 space-y-2">
        {sets.map((set, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-sm text-neutral-400">{i + 1}.</span>
            {columns.map((col) => (
              <input
                key={col.id}
                type="number"
                min={0}
                step={col.unit === 'time' && timeUnitFor(col.id) === 'min' ? 0.1 : 1}
                placeholder={columnLabel(col)}
                value={
                  set.values[col.id]
                    ? col.unit === 'time' && timeUnitFor(col.id) === 'min'
                      ? set.values[col.id] / 60
                      : set.values[col.id]
                    : ''
                }
                onChange={(e) =>
                  col.unit === 'time'
                    ? updateDuration(i, col.id, Number(e.target.value))
                    : updateSetValue(i, col.id, Number(e.target.value))
                }
                onBlur={() => onValueCommit?.(col.id, sets[i]?.values[col.id] ?? 0)}
                className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm sm:px-3 sm:py-2 sm:text-base"
              />
            ))}
            <input
              type="checkbox"
              checked={Boolean(set.completed)}
              onChange={(e) => updateSetCompleted(i, e.target.checked)}
              title="Satz erledigt"
              className="h-5 w-5 shrink-0 accent-neutral-900"
            />
          </div>
        ))}
      </div>
      <button onClick={addSet} className="mt-3 text-sm text-neutral-500 underline">
        + Satz hinzufügen
      </button>

      {onColumnsChange && (
        <div className="mt-3">
          {!addingColumn ? (
            <button onClick={() => setAddingColumn(true)} className="text-sm text-neutral-500 underline">
              + Spalte hinzufügen
            </button>
          ) : (
            <div className="rounded-lg border border-neutral-200 p-3">
              <p className="mb-2 text-xs font-medium text-neutral-500">Einheit wählen</p>
              <div className="mb-2 flex flex-wrap gap-2">
                {UNIT_ORDER.map((unit) => (
                  <button
                    key={unit}
                    onClick={() => addColumn(unit)}
                    className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-600"
                  >
                    {UNIT_LABELS[unit]}
                  </button>
                ))}
              </div>
              <input
                value={newColumnLabel}
                onChange={(e) => setNewColumnLabel(e.target.value)}
                placeholder="Eigene Bezeichnung (optional)"
                className="mb-2 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => {
                  setAddingColumn(false);
                  setNewColumnLabel('');
                }}
                className="text-xs text-neutral-400"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      )}

      {onCommentChange && (
        <details className="mt-3 rounded-lg border border-neutral-200">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-neutral-600">
            Kommentar {comment ? '📝' : ''}
          </summary>
          <div className="px-3 pb-3">
            <textarea
              value={comment ?? ''}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Notiz zu dieser Übung…"
              rows={2}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </details>
      )}
      <ImageLightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />
    </div>
  );
}
