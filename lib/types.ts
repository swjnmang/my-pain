export type Category = 'oberkoerper' | 'unterkoerper' | 'ganzkoerper' | 'warmup';

export type LogType = 'weight_reps' | 'time';

export type UnitKey = 'kg' | 'reps' | 'time' | 'distance_m' | 'rpe';

export const UNIT_LABELS: Record<UnitKey, string> = {
  kg: 'Kilogramm (kg)',
  reps: 'Wiederholungen',
  time: 'Zeit',
  distance_m: 'Distanz (m)',
  rpe: 'Anstrengung (RPE)',
};

export const UNIT_SHORT: Record<UnitKey, string> = {
  kg: 'kg',
  reps: 'Wdh.',
  time: 'Zeit',
  distance_m: 'm',
  rpe: 'RPE',
};

export interface Column {
  id: string;
  unit: UnitKey;
  label?: string;
}

export interface SetEntry {
  completed?: boolean;
  values: Record<string, number>;
}

export type PainArea =
  | 'ruecken'
  | 'nacken_schulter'
  | 'huefte'
  | 'knie'
  | 'achillessehne'
  | 'plantarfaszie';

export const PAIN_AREA_LABELS: Record<PainArea, string> = {
  ruecken: 'Rücken',
  nacken_schulter: 'Nacken/Schulter',
  huefte: 'Hüfte',
  knie: 'Knie',
  achillessehne: 'Achillessehne',
  plantarfaszie: 'Plantarfaszie',
};

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  columns: Column[];
  defaultValues?: Record<string, number>; // columnId -> zuletzt verwendeter Wert, Startpunkt fürs nächste Loggen
  videoUrl?: string;
  images?: string[]; // Base64 Data-URLs, clientseitig verkleinert
  painAreas?: PainArea[];
  note?: string; // kurzer Hinweis zur Ausführung, z.B. HSR-Technik
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  category: Category;
  exerciseIds: string[];
  painAreas?: PainArea[];
}

export interface Workout {
  id: string;
  name: string;
  category: Category;
  exerciseIds: string[];
  createdAt: number;
}

export interface PreSurvey {
  painLevel: number; // 0-10
  painRegion: string;
  sleepHours: number;
  mood: number; // 0-10
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  columns: Column[];
  sets: SetEntry[];
  comment?: string;
}

export interface Session {
  id: string;
  sourceId: string;
  sourceName: string;
  category: Category;
  date: string; // ISO date
  preSurvey: PreSurvey;
  exerciseLogs: ExerciseLog[];
  createdAt: number;
  durationSec?: number;
}

export interface PlannedTraining {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  sourceType: 'template' | 'workout';
  sourceId: string;
  sourceName: string;
  category: Category;
  createdAt: number;
}

export interface UserProfile {
  heightCm?: number;
  weightKg?: number;
  updatedAt: number;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  oberkoerper: 'Oberkörper',
  unterkoerper: 'Unterkörper',
  ganzkoerper: 'Ganzkörper',
  warmup: 'Warm-up',
};
