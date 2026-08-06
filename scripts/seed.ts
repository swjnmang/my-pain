import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SEED_EXERCISES, SEED_WORKOUT_TEMPLATES } from '../lib/seedExercises';

// Erwartet eine Service-Account-JSON unter GOOGLE_APPLICATION_CREDENTIALS
// oder als Pfad in SEED_SERVICE_ACCOUNT_PATH (siehe README).
const serviceAccountPath = process.env.SEED_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  console.error(
    'Fehler: Setze SEED_SERVICE_ACCOUNT_PATH oder GOOGLE_APPLICATION_CREDENTIALS auf den Pfad deiner Firebase-Service-Account-JSON.'
  );
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(require(serviceAccountPath)) });
}

async function seed() {
  const db = getFirestore();
  const batch = db.batch();

  for (const exercise of SEED_EXERCISES) {
    batch.set(db.collection('exercises').doc(exercise.id), exercise);
  }
  for (const template of SEED_WORKOUT_TEMPLATES) {
    batch.set(db.collection('workoutTemplates').doc(template.id), template);
  }

  await batch.commit();
  console.log(
    `Seed abgeschlossen: ${SEED_EXERCISES.length} Übungen, ${SEED_WORKOUT_TEMPLATES.length} Trainingsvorlagen.`
  );
}

seed().catch((error) => {
  console.error('Seed fehlgeschlagen:', error);
  process.exit(1);
});
