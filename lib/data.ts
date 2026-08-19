import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Exercise,
  WorkoutTemplate,
  Workout,
  Session,
  PlannedTraining,
  PreSurvey,
  ExerciseLog,
  UserProfile,
} from './types';
import { normalizeExercise, normalizeExerciseLog } from './columns';
import { normalizeBlocks } from './blocks';

function requireDb() {
  if (!db) throw new Error('Firebase ist nicht konfiguriert.');
  return db;
}

export async function getExercises(): Promise<Exercise[]> {
  const snap = await getDocs(collection(requireDb(), 'exercises'));
  return snap.docs.map((d) => normalizeExercise(d.id, d.data()));
}

export async function getUserExercises(uid: string): Promise<Exercise[]> {
  const snap = await getDocs(collection(requireDb(), 'users', uid, 'exercises'));
  return snap.docs.map((d) => normalizeExercise(d.id, d.data()));
}

export async function createUserExercise(uid: string, exercise: Omit<Exercise, 'id'>): Promise<string> {
  const ref = await addDoc(collection(requireDb(), 'users', uid, 'exercises'), exercise);
  return ref.id;
}

export async function getUserExercise(uid: string, id: string): Promise<Exercise | null> {
  const snap = await getDoc(doc(requireDb(), 'users', uid, 'exercises', id));
  return snap.exists() ? normalizeExercise(snap.id, snap.data()) : null;
}

export async function updateUserExercise(
  uid: string,
  id: string,
  exercise: Omit<Exercise, 'id'>
): Promise<void> {
  await updateDoc(doc(requireDb(), 'users', uid, 'exercises', id), exercise);
}

export async function getAllExercisesForUser(uid: string): Promise<Exercise[]> {
  const [global, own] = await Promise.all([getExercises(), getUserExercises(uid)]);
  return [...global, ...own];
}

function normalizeWorkoutTemplate(id: string, raw: Record<string, unknown>): WorkoutTemplate {
  return { ...raw, id, blocks: normalizeBlocks(raw) } as WorkoutTemplate;
}

function normalizeWorkout(id: string, raw: Record<string, unknown>): Workout {
  return { ...raw, id, blocks: normalizeBlocks(raw) } as Workout;
}

export async function getWorkoutTemplates(): Promise<WorkoutTemplate[]> {
  const snap = await getDocs(collection(requireDb(), 'workoutTemplates'));
  return snap.docs.map((d) => normalizeWorkoutTemplate(d.id, d.data()));
}

export async function getWorkoutTemplate(id: string): Promise<WorkoutTemplate | null> {
  const snap = await getDoc(doc(requireDb(), 'workoutTemplates', id));
  return snap.exists() ? normalizeWorkoutTemplate(snap.id, snap.data()) : null;
}

export async function getUserWorkouts(uid: string): Promise<Workout[]> {
  const snap = await getDocs(collection(requireDb(), 'users', uid, 'workouts'));
  return snap.docs.map((d) => normalizeWorkout(d.id, d.data()));
}

export async function getUserWorkout(uid: string, workoutId: string): Promise<Workout | null> {
  const snap = await getDoc(doc(requireDb(), 'users', uid, 'workouts', workoutId));
  return snap.exists() ? normalizeWorkout(snap.id, snap.data()) : null;
}

export async function createUserWorkout(
  uid: string,
  workout: Omit<Workout, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(requireDb(), 'users', uid, 'workouts'), workout);
  return ref.id;
}

export async function updateUserWorkout(
  uid: string,
  id: string,
  workout: Omit<Workout, 'id' | 'createdAt'>
): Promise<void> {
  await updateDoc(doc(requireDb(), 'users', uid, 'workouts', id), workout);
}

function normalizeSession(id: string, raw: Record<string, unknown>): Session {
  const exerciseLogs = Array.isArray(raw.exerciseLogs)
    ? (raw.exerciseLogs as Record<string, unknown>[]).map((log) => normalizeExerciseLog(log))
    : [];
  return { id, ...raw, exerciseLogs } as Session;
}

export async function getSessions(uid: string): Promise<Session[]> {
  const q = query(collection(requireDb(), 'users', uid, 'sessions'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeSession(d.id, d.data()));
}

export async function createSession(uid: string, session: Omit<Session, 'id'>): Promise<string> {
  const ref = await addDoc(collection(requireDb(), 'users', uid, 'sessions'), session);
  return ref.id;
}

export async function getSession(uid: string, sessionId: string): Promise<Session | null> {
  const snap = await getDoc(doc(requireDb(), 'users', uid, 'sessions', sessionId));
  return snap.exists() ? normalizeSession(snap.id, snap.data()) : null;
}

export async function updateSession(
  uid: string,
  sessionId: string,
  data: { date: string; preSurvey: PreSurvey; exerciseLogs: ExerciseLog[] }
): Promise<void> {
  await updateDoc(doc(requireDb(), 'users', uid, 'sessions', sessionId), data);
}

export async function deleteSession(uid: string, sessionId: string): Promise<void> {
  await deleteDoc(doc(requireDb(), 'users', uid, 'sessions', sessionId));
}

export async function getPlannedTrainings(uid: string): Promise<PlannedTraining[]> {
  const snap = await getDocs(collection(requireDb(), 'users', uid, 'plannedTrainings'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PlannedTraining);
}

export async function createPlannedTraining(
  uid: string,
  planned: Omit<PlannedTraining, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(requireDb(), 'users', uid, 'plannedTrainings'), planned);
  return ref.id;
}

export async function deletePlannedTraining(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(requireDb(), 'users', uid, 'plannedTrainings', id));
}

export async function movePlannedTraining(uid: string, id: string, newDate: string): Promise<void> {
  await updateDoc(doc(requireDb(), 'users', uid, 'plannedTrainings', id), { date: newDate });
}

export async function updatePlannedTrainingSource(
  uid: string,
  id: string,
  source: { sourceType: 'template' | 'workout'; sourceId: string; sourceName: string }
): Promise<void> {
  await updateDoc(doc(requireDb(), 'users', uid, 'plannedTrainings', id), source);
}

export async function forkExerciseToUserExercise(uid: string, exercise: Exercise): Promise<string> {
  const ref = await addDoc(collection(requireDb(), 'users', uid, 'exercises'), {
    name: exercise.name,
    category: exercise.category,
    columns: exercise.columns,
    ...(exercise.videoUrl ? { videoUrl: exercise.videoUrl } : {}),
    ...(exercise.images ? { images: exercise.images } : {}),
    ...(exercise.painAreas ? { painAreas: exercise.painAreas } : {}),
    ...(exercise.note ? { note: exercise.note } : {}),
  });
  return ref.id;
}

export async function forkWorkoutTemplateToWorkout(uid: string, template: WorkoutTemplate): Promise<string> {
  const ref = await addDoc(collection(requireDb(), 'users', uid, 'workouts'), {
    name: template.name,
    category: template.category,
    blocks: template.blocks,
    createdAt: Date.now(),
  });
  return ref.id;
}

const MAX_RECURRING_OCCURRENCES = 12;

function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const pad2 = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export async function createRecurringPlannedTrainings(
  uid: string,
  planned: Omit<PlannedTraining, 'id'>,
  intervalDays: number
): Promise<void> {
  const batch = writeBatch(requireDb());
  const collectionRef = collection(requireDb(), 'users', uid, 'plannedTrainings');
  for (let i = 0; i < MAX_RECURRING_OCCURRENCES; i++) {
    const date = addDaysToDateKey(planned.date, i * intervalDays);
    const ref = doc(collectionRef);
    batch.set(ref, { ...planned, date });
  }
  await batch.commit();
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(requireDb(), 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateUserProfile(
  uid: string,
  profile: Omit<UserProfile, 'updatedAt'>
): Promise<void> {
  await setDoc(doc(requireDb(), 'users', uid), { ...profile, updatedAt: Date.now() }, { merge: true });
}
