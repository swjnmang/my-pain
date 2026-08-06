import { Exercise, WorkoutTemplate } from './types';

export const SEED_EXERCISES: Exercise[] = [
  // Oberkörper
  { id: 'bankdruecken', name: 'Bankdrücken', category: 'oberkoerper', logType: 'weight_reps' },
  { id: 'latzug', name: 'Latzug', category: 'oberkoerper', logType: 'weight_reps' },
  { id: 'schulterdruecken', name: 'Schulterdrücken', category: 'oberkoerper', logType: 'weight_reps' },
  { id: 'rudern-kabelzug', name: 'Rudern (Kabelzug)', category: 'oberkoerper', logType: 'weight_reps' },
  { id: 'bizepscurls', name: 'Bizepscurls', category: 'oberkoerper', logType: 'weight_reps' },
  { id: 'trizepsdruecken', name: 'Trizepsdrücken', category: 'oberkoerper', logType: 'weight_reps' },
  { id: 'klimmzuege', name: 'Klimmzüge', category: 'oberkoerper', logType: 'weight_reps' },
  { id: 'liegestuetze', name: 'Liegestütze', category: 'oberkoerper', logType: 'weight_reps' },

  // Unterkörper
  { id: 'kniebeuge', name: 'Kniebeuge', category: 'unterkoerper', logType: 'weight_reps' },
  { id: 'beinpresse', name: 'Beinpresse', category: 'unterkoerper', logType: 'weight_reps' },
  { id: 'ausfallschritte', name: 'Ausfallschritte', category: 'unterkoerper', logType: 'weight_reps' },
  { id: 'beinstrecker', name: 'Beinstrecker', category: 'unterkoerper', logType: 'weight_reps' },
  { id: 'beinbeuger', name: 'Beinbeuger', category: 'unterkoerper', logType: 'weight_reps' },
  { id: 'wadenheben', name: 'Wadenheben', category: 'unterkoerper', logType: 'weight_reps' },
  { id: 'hueftabduktion', name: 'Hüftabduktion', category: 'unterkoerper', logType: 'weight_reps' },
  { id: 'kreuzheben', name: 'Kreuzheben', category: 'unterkoerper', logType: 'weight_reps' },

  // Ganzkörper
  { id: 'plank', name: 'Plank', category: 'ganzkoerper', logType: 'time' },
  { id: 'burpees', name: 'Burpees', category: 'ganzkoerper', logType: 'weight_reps' },
  { id: 'rudergeraet', name: 'Rudergerät (Cardio)', category: 'ganzkoerper', logType: 'time' },
  { id: 'radfahren', name: 'Radfahren (Cardio)', category: 'ganzkoerper', logType: 'time' },
  { id: 'mountain-climbers', name: 'Mountain Climbers', category: 'ganzkoerper', logType: 'time' },
  { id: 'kettlebell-swings', name: 'Kettlebell Swings', category: 'ganzkoerper', logType: 'weight_reps' },
  { id: 'springseil', name: 'Springseil', category: 'ganzkoerper', logType: 'time' },
  { id: 'crunches', name: 'Crunches', category: 'ganzkoerper', logType: 'weight_reps' },
];

export const SEED_WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'oberkoerper-basic',
    name: 'Oberkörper Basic',
    category: 'oberkoerper',
    exerciseIds: ['bankdruecken', 'latzug', 'schulterdruecken', 'bizepscurls', 'trizepsdruecken'],
  },
  {
    id: 'unterkoerper-basic',
    name: 'Unterkörper Basic',
    category: 'unterkoerper',
    exerciseIds: ['kniebeuge', 'beinpresse', 'ausfallschritte', 'wadenheben'],
  },
  {
    id: 'ganzkoerper-basic',
    name: 'Ganzkörper Basic',
    category: 'ganzkoerper',
    exerciseIds: ['plank', 'kettlebell-swings', 'burpees', 'crunches'],
  },
];
