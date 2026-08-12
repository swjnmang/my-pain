import { Column, SetEntry } from './types';

interface Guess {
  weight?: number;
  reps?: number;
  durationSec?: number;
}

// Grob geschätzte Einstiegsbelastung je geseedeter Übung (Beginner-/Mittelstufe-Niveau),
// dient nur als Startpunkt beim ersten Loggen — frei überschreibbar.
export const DEFAULT_GUESS: Record<string, Guess> = {
  bankdruecken: { weight: 40, reps: 10 },
  latzug: { weight: 40, reps: 10 },
  schulterdruecken: { weight: 20, reps: 10 },
  'rudern-kabelzug': { weight: 35, reps: 10 },
  bizepscurls: { weight: 12, reps: 10 },
  trizepsdruecken: { weight: 20, reps: 10 },
  klimmzuege: { weight: 0, reps: 8 },
  liegestuetze: { weight: 0, reps: 12 },

  kniebeuge: { weight: 40, reps: 10 },
  beinpresse: { weight: 60, reps: 10 },
  ausfallschritte: { weight: 10, reps: 10 },
  beinstrecker: { weight: 30, reps: 10 },
  beinbeuger: { weight: 25, reps: 10 },
  wadenheben: { weight: 30, reps: 12 },
  hueftabduktion: { weight: 20, reps: 12 },
  kreuzheben: { weight: 40, reps: 8 },

  'wadenheben-hsr': { weight: 30, reps: 15 },
  'wadenheben-handtuch': { weight: 0, reps: 12 },
  'decline-squat': { weight: 0, reps: 15 },
  'hueftabduktion-isometrisch': { weight: 15, reps: 10 },
  'aussenrotation-band': { weight: 0, reps: 12 },
  'mcgill-curl-up': { durationSec: 8 },
  'mcgill-side-plank': { durationSec: 15 },
  'mcgill-bird-dog': { durationSec: 8 },

  plank: { durationSec: 30 },
  burpees: { weight: 0, reps: 10 },
  rudergeraet: { durationSec: 300 },
  radfahren: { durationSec: 600 },
  'mountain-climbers': { durationSec: 30 },
  'kettlebell-swings': { weight: 16, reps: 12 },
  springseil: { durationSec: 60 },
  crunches: { weight: 0, reps: 15 },
};

const FALLBACK_WEIGHT_REPS: Required<Pick<Guess, 'weight' | 'reps'>> = { weight: 20, reps: 10 };
const FALLBACK_DURATION_SEC = 30;

function guessedValueForColumn(guess: Guess | undefined, unit: Column['unit']): number {
  switch (unit) {
    case 'kg':
      return guess?.weight ?? FALLBACK_WEIGHT_REPS.weight;
    case 'reps':
      return guess?.reps ?? FALLBACK_WEIGHT_REPS.reps;
    case 'time':
      return guess?.durationSec ?? FALLBACK_DURATION_SEC;
    default:
      return 0;
  }
}

export function getDefaultSets(exerciseId: string, columns: Column[]): SetEntry[] {
  const guess = DEFAULT_GUESS[exerciseId];
  const values = Object.fromEntries(
    columns.map((col) => [col.id, guessedValueForColumn(guess, col.unit)])
  );
  return [{ values: { ...values } }, { values: { ...values } }, { values: { ...values } }];
}
