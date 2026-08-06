export type Category = 'oberkoerper' | 'unterkoerper' | 'ganzkoerper';

export type LogType = 'weight_reps' | 'time';

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  logType: LogType;
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

export const CATEGORY_LABELS: Record<Category, string> = {
  oberkoerper: 'Oberkörper',
  unterkoerper: 'Unterkörper',
  ganzkoerper: 'Ganzkörper',
};
