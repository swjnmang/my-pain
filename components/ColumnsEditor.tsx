'use client';

import { useState } from 'react';
import { Column, UNIT_LABELS, UnitKey } from '@/lib/types';
import { columnLabel, makeColumnId } from '@/lib/columns';

const UNIT_ORDER: UnitKey[] = ['kg', 'reps', 'time', 'distance_m', 'rpe'];

interface Props {
  columns: Column[];
  onChange: (columns: Column[]) => void;
}

export default function ColumnsEditor({ columns, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');

  function addColumn(unit: UnitKey) {
    onChange([...columns, { id: makeColumnId(), unit, ...(label.trim() ? { label: label.trim() } : {}) }]);
    setAdding(false);
    setLabel('');
  }

  function removeColumn(id: string) {
    if (columns.length <= 1) return;
    onChange(columns.filter((c) => c.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {columns.map((col) => (
          <span
            key={col.id}
            className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-600"
          >
            {columnLabel(col)}
            {columns.length > 1 && (
              <button onClick={() => removeColumn(col.id)} className="text-neutral-400" title="Spalte entfernen">
                ✕
              </button>
            )}
          </span>
        ))}
      </div>

      {!adding ? (
        <button onClick={() => setAdding(true)} className="mt-2 text-sm text-neutral-500 underline">
          + Spalte hinzufügen
        </button>
      ) : (
        <div className="mt-2 rounded-lg border border-neutral-200 p-3">
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
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Eigene Bezeichnung (optional)"
            className="mb-2 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            onClick={() => {
              setAdding(false);
              setLabel('');
            }}
            className="text-xs text-neutral-400"
          >
            Abbrechen
          </button>
        </div>
      )}
    </div>
  );
}
