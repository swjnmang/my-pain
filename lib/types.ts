export type Category = 'oberkoerper' | 'unterkoerper' | 'ganzkoerper';

export type LogType = 'weight_reps' | 'time';

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
  logType: LogType;
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

export interface WeightRepsSet {
  weight: number;
  reps: number;
}

export interface TimeSet {
  durationSec: number;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  logType: LogType;
  sets: WeightRepsSet[] | TimeSet[];
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

export const CATEGORY_LABELS: Record<Category, string> = {
  oberkoerper: 'Oberkörper',
  unterkoerper: 'Unterkörper',
  ganzkoerper: 'Ganzkörper',
};
