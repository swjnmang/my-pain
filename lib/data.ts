import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Exercise, WorkoutTemplate, Workout, Session, PlannedTraining, PreSurvey, ExerciseLog } from './types';

function requireDb() {
  if (!db) throw new Error('Firebase ist nicht konfiguriert.');
  return db;
}

export async function getExercises(): Promise<Exercise[]> {
  const snap = await getDocs(collection(requireDb(), 'exercises'));
  return snap.docs.map((d) => d.data() as Exercise);
}

export async function getWorkoutTemplates(): Promise<WorkoutTemplate[]> {
  const snap = await getDocs(collection(requireDb(), 'workoutTemplates'));
  return snap.docs.map((d) => d.data() as WorkoutTemplate);
}

export async function getWorkoutTemplate(id: string): Promise<WorkoutTemplate | null> {
  const snap = await getDoc(doc(requireDb(), 'workoutTemplates', id));
  return snap.exists() ? (snap.data() as WorkoutTemplate) : null;
}

export async function getUserWorkouts(uid: string): Promise<Workout[]> {
  const snap = await getDocs(collection(requireDb(), 'users', uid, 'workouts'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Workout);
}

export async function getUserWorkout(uid: string, workoutId: string): Promise<Workout | null> {
  const snap = await getDoc(doc(requireDb(), 'users', uid, 'workouts', workoutId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Workout) : null;
}

export async function createUserWorkout(
  uid: string,
  workout: Omit<Workout, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(requireDb(), 'users', uid, 'workouts'), workout);
  return ref.id;
}

export async function getSessions(uid: string): Promise<Session[]> {
  const q = query(collection(requireDb(), 'users', uid, 'sessions'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Session);
}

export async function createSession(uid: string, session: Omit<Session, 'id'>): Promise<string> {
  const ref = await addDoc(collection(requireDb(), 'users', uid, 'sessions'), session);
  return ref.id;
}

export async function getSession(uid: string, sessionId: string): Promise<Session | null> {
  const snap = await getDoc(doc(requireDb(), 'users', uid, 'sessions', sessionId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Session) : null;
}

export async function updateSession(
  uid: string,
  sessionId: string,
  data: { date: string; preSurvey: PreSurvey; exerciseLogs: ExerciseLog[] }
): Promise<void> {
  await updateDoc(doc(requireDb(), 'users', uid, 'sessions', sessionId), data);
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
