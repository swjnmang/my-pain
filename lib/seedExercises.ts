import { Exercise, WorkoutTemplate } from './types';

function youtubeSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} Übung Ausführung`)}`;
}

export const SEED_EXERCISES: Exercise[] = [
  // Oberkörper
  { id: 'bankdruecken', name: 'Bankdrücken', category: 'oberkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Bankdrücken') },
  { id: 'latzug', name: 'Latzug', category: 'oberkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Latzug'), painAreas: ['nacken_schulter'] },
  { id: 'schulterdruecken', name: 'Schulterdrücken', category: 'oberkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Schulterdrücken'), painAreas: ['nacken_schulter'] },
  { id: 'rudern-kabelzug', name: 'Rudern (Kabelzug)', category: 'oberkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Rudern Kabelzug'), painAreas: ['nacken_schulter', 'ruecken'] },
  { id: 'bizepscurls', name: 'Bizepscurls', category: 'oberkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Bizepscurls') },
  { id: 'trizepsdruecken', name: 'Trizepsdrücken', category: 'oberkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Trizepsdrücken') },
  { id: 'klimmzuege', name: 'Klimmzüge', category: 'oberkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Klimmzüge'), painAreas: ['nacken_schulter'] },
  { id: 'liegestuetze', name: 'Liegestütze', category: 'oberkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Liegestütze') },

  // Unterkörper
  { id: 'kniebeuge', name: 'Kniebeuge', category: 'unterkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Kniebeuge'), painAreas: ['knie', 'huefte'] },
  { id: 'beinpresse', name: 'Beinpresse', category: 'unterkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Beinpresse'), painAreas: ['knie'] },
  { id: 'ausfallschritte', name: 'Ausfallschritte', category: 'unterkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Ausfallschritte'), painAreas: ['knie', 'huefte'] },
  { id: 'beinstrecker', name: 'Beinstrecker', category: 'unterkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Beinstrecker Maschine'), painAreas: ['knie'] },
  { id: 'beinbeuger', name: 'Beinbeuger', category: 'unterkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Beinbeuger Maschine'), painAreas: ['knie', 'ruecken'] },
  { id: 'wadenheben', name: 'Wadenheben', category: 'unterkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Wadenheben'), painAreas: ['achillessehne', 'plantarfaszie'] },
  { id: 'hueftabduktion', name: 'Hüftabduktion', category: 'unterkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Hüftabduktion Maschine'), painAreas: ['huefte'] },
  { id: 'kreuzheben', name: 'Kreuzheben', category: 'unterkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Kreuzheben'), painAreas: ['ruecken', 'huefte'] },

  // Ganzkörper
  { id: 'plank', name: 'Plank', category: 'ganzkoerper', logType: 'time', videoUrl: youtubeSearch('Plank'), painAreas: ['ruecken'] },
  { id: 'burpees', name: 'Burpees', category: 'ganzkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Burpees') },
  { id: 'rudergeraet', name: 'Rudergerät (Cardio)', category: 'ganzkoerper', logType: 'time', videoUrl: youtubeSearch('Rudergerät Technik'), painAreas: ['ruecken', 'nacken_schulter'] },
  { id: 'radfahren', name: 'Radfahren (Cardio)', category: 'ganzkoerper', logType: 'time', videoUrl: youtubeSearch('Radfahren Ergometer'), painAreas: ['knie', 'huefte'] },
  { id: 'mountain-climbers', name: 'Mountain Climbers', category: 'ganzkoerper', logType: 'time', videoUrl: youtubeSearch('Mountain Climbers') },
  { id: 'kettlebell-swings', name: 'Kettlebell Swings', category: 'ganzkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Kettlebell Swings'), painAreas: ['huefte', 'ruecken'] },
  { id: 'springseil', name: 'Springseil', category: 'ganzkoerper', logType: 'time', videoUrl: youtubeSearch('Springseil Technik'), painAreas: ['achillessehne', 'plantarfaszie'] },
  { id: 'crunches', name: 'Crunches', category: 'ganzkoerper', logType: 'weight_reps', videoUrl: youtubeSearch('Crunches'), painAreas: ['ruecken'] },
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
