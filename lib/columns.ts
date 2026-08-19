import { Column, Exercise, ExerciseLog, LogType, SetEntry, UNIT_SHORT } from './types';

export function makeColumnId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `col_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultColumns(): Column[] {
  return [
    { id: 'kg', unit: 'kg' },
    { id: 'reps', unit: 'reps' },
  ];
}

export function legacyColumnsForLogType(logType?: LogType): Column[] {
  if (logType === 'time') {
    return [{ id: 'time', unit: 'time' }];
  }
  return defaultColumns();
}

export function columnLabel(column: Column): string {
  return column.label?.trim() || UNIT_SHORT[column.unit];
}

export function emptySetValues(columns: Column[]): Record<string, number> {
  return Object.fromEntries(columns.map((c) => [c.id, 0]));
}

function resolveColumns(raw: { columns?: unknown; logType?: LogType }): Column[] {
  if (Array.isArray(raw.columns) && raw.columns.length > 0) {
    return raw.columns as Column[];
  }
  return legacyColumnsForLogType(raw.logType);
}

function normalizeRawSet(
  raw: Record<string, unknown>,
  columns: Column[]
): SetEntry {
  const completed = typeof raw.completed === 'boolean' ? raw.completed : undefined;
  if (raw.values && typeof raw.values === 'object') {
    return { completed, values: raw.values as Record<string, number> };
  }
  // Legacy shape: { weight, reps } or { durationSec }
  const values: Record<string, number> = {};
  for (const col of columns) {
    if (col.unit === 'kg' && typeof raw.weight === 'number') values[col.id] = raw.weight;
    if (col.unit === 'reps' && typeof raw.reps === 'number') values[col.id] = raw.reps;
    if (col.unit === 'time' && typeof raw.durationSec === 'number') values[col.id] = raw.durationSec;
  }
  return { completed, values };
}

export function normalizeExercise(id: string, raw: Record<string, unknown>): Exercise {
  const columns = resolveColumns(raw as { columns?: unknown; logType?: LogType });
  return {
    id,
    name: raw.name as string,
    category: raw.category as Exercise['category'],
    columns,
    defaultValues:
      raw.defaultValues && typeof raw.defaultValues === 'object'
        ? (raw.defaultValues as Record<string, number>)
        : undefined,
    videoUrl: raw.videoUrl as string | undefined,
    images: raw.images as string[] | undefined,
    painAreas: raw.painAreas as Exercise['painAreas'],
    note: raw.note as string | undefined,
  };
}

export function exerciseWritePayload(
  ex: Exercise,
  patch: Partial<Pick<Exercise, 'columns' | 'defaultValues'>> = {}
): Omit<Exercise, 'id'> {
  const columns = patch.columns ?? ex.columns;
  const defaultValues = patch.defaultValues ?? ex.defaultValues;
  return {
    name: ex.name,
    category: ex.category,
    columns,
    ...(defaultValues ? { defaultValues } : {}),
    ...(ex.videoUrl ? { videoUrl: ex.videoUrl } : {}),
    ...(ex.images ? { images: ex.images } : {}),
    ...(ex.painAreas ? { painAreas: ex.painAreas } : {}),
    ...(ex.note ? { note: ex.note } : {}),
  };
}

export function normalizeExerciseLog(raw: Record<string, unknown>): ExerciseLog {
  const columns = resolveColumns(raw as { columns?: unknown; logType?: LogType });
  const rawSets = Array.isArray(raw.sets) ? (raw.sets as Record<string, unknown>[]) : [];
  return {
    exerciseId: raw.exerciseId as string,
    exerciseName: raw.exerciseName as string,
    columns,
    sets: rawSets.map((s) => normalizeRawSet(s, columns)),
    comment: raw.comment as string | undefined,
  };
}

export function remapSetsToColumns(
  sets: SetEntry[],
  fromColumns: Column[],
  toColumns: Column[]
): SetEntry[] {
  return sets.map((set) => {
    const values: Record<string, number> = {};
    for (const col of toColumns) {
      if (set.values[col.id] !== undefined) {
        values[col.id] = set.values[col.id];
        continue;
      }
      const sameUnitSource = fromColumns.find((c) => c.unit === col.unit);
      values[col.id] = sameUnitSource ? (set.values[sameUnitSource.id] ?? 0) : 0;
    }
    return { completed: set.completed, values };
  });
}

export function formatSetEntry(columns: Column[], set: SetEntry): string {
  return columns
    .map((col) => {
      const value = set.values[col.id] ?? 0;
      return col.unit === 'time' ? `${value}s` : `${value}${UNIT_SHORT[col.unit]}`;
    })
    .join(' × ');
}

export function formatSets(columns: Column[], sets: SetEntry[]): string {
  return sets.map((set) => formatSetEntry(columns, set)).join(', ');
}
