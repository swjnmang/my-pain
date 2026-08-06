'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getAllExercisesForUser, createUserWorkout } from '@/lib/data';
import { Exercise, PainArea, PAIN_AREA_LABELS, Category, CATEGORY_LABELS } from '@/lib/types';

const PAIN_AREAS: PainArea[] = ['ruecken', 'nacken_schulter', 'huefte', 'knie', 'achillessehne', 'plantarfaszie'];
const TARGET_TOTAL = 10;

// Evidenzbasierte Protokoll-Übungen, die bei Auswahl des jeweiligen Schmerzbereichs
// immer Teil des generierten Trainings sind (siehe Recherche im Plan-Dokument).
const PROTOCOL_EXERCISES: Partial<Record<PainArea, string[]>> = {
  achillessehne: ['wadenheben-hsr'],
  plantarfaszie: ['wadenheben-handtuch'],
  ruecken: ['mcgill-curl-up', 'mcgill-side-plank', 'mcgill-bird-dog'],
  knie: ['decline-squat'],
  huefte: ['hueftabduktion-isometrisch'],
  nacken_schulter: ['aussenrotation-band'],
};

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function GeneratorInner() {
  const { user } = useAuth();
  const router = useRouter();

  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<Set<PainArea>>(new Set());
  const [suggested, setSuggested] = useState<Exercise[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getAllExercisesForUser(user.uid)
      .then(setAllExercises)
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, [user]);

  const matches = useMemo(() => {
    if (selectedAreas.size === 0) return [];
    return allExercises.filter((ex) => ex.painAreas?.some((a) => selectedAreas.has(a)));
  }, [allExercises, selectedAreas]);

  const requiredIds = useMemo(() => {
    const ids = new Set<string>();
    for (const area of Array.from(selectedAreas)) {
      for (const id of PROTOCOL_EXERCISES[area] ?? []) {
        if (matches.some((ex) => ex.id === id)) ids.add(id);
      }
    }
    return ids;
  }, [selectedAreas, matches]);

  function toggleArea(area: PainArea) {
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
    setSuggested([]);
    setSelectedIds(new Set());
  }

  function reshuffle() {
    const optional = matches.filter((ex) => !requiredIds.has(ex.id));
    const fillCount = Math.max(0, TARGET_TOTAL - requiredIds.size);
    const filled = shuffle(optional).slice(0, fillCount);
    const required = matches.filter((ex) => requiredIds.has(ex.id));
    const picked = [...required, ...filled];
    setSuggested(picked);
    setSelectedIds(new Set(picked.map((ex) => ex.id)));
  }

  function toggleSelected(id: string) {
    if (requiredIds.has(id)) return; // Protokoll-Pflichtübung, nicht abwählbar
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaveAndStart() {
    if (!user || selectedIds.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const chosen = allExercises.filter((ex) => selectedIds.has(ex.id));
      const categoryCounts = new Map<Category, number>();
      for (const ex of chosen) {
        categoryCounts.set(ex.category, (categoryCounts.get(ex.category) ?? 0) + 1);
      }
      const category = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
      const areaLabels = Array.from(selectedAreas).map((a) => PAIN_AREA_LABELS[a]).join('/');
      const name = `${areaLabels}-Training – ${new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`;

      const workoutId = await createUserWorkout(user.uid, {
        name,
        category,
        exerciseIds: Array.from(selectedIds),
        createdAt: Date.now(),
      });
      router.replace(`/session/new?type=workout&id=${workoutId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Training nach Schmerzbereich">
      <p className="mb-4 text-xs text-neutral-400">
        Keine medizinische Beratung. Die vorgeschlagenen Übungen orientieren sich an in Studien
        geprüften Trainingsprotokollen (z.B. Heavy-Slow-Resistance- bzw. Alfredson-Prinzip für die
        Achillessehne). Ein gewisses Maß an Trainingsschmerz ist bei diesen Protokollen üblich —
        scharfer oder zunehmender Schmerz ist ein Stopp-Signal. Bei starken oder anhaltenden
        Schmerzen bitte ärztlich bzw. physiotherapeutisch abklären lassen.
      </p>

      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {!loading && (
        <>
          <p className="mb-2 text-sm font-medium">Wo hast du Schmerzen?</p>
          <div className="mb-6 flex flex-wrap gap-2">
            {PAIN_AREAS.map((area) => (
              <button
                key={area}
                onClick={() => toggleArea(area)}
                className={clsx(
                  'rounded-full px-3 py-1.5 text-sm',
                  selectedAreas.has(area) ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
                )}
              >
                {PAIN_AREA_LABELS[area]}
              </button>
            ))}
          </div>

          {selectedAreas.size > 0 && matches.length === 0 && (
            <p className="text-sm text-neutral-400">Keine passenden Übungen für diese Auswahl gefunden.</p>
          )}

          {selectedAreas.size > 0 && matches.length > 0 && suggested.length === 0 && (
            <button
              onClick={reshuffle}
              className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white"
            >
              Training vorschlagen
            </button>
          )}

          {suggested.length > 0 && (
            <div className="pb-8">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">Vorschlag ({selectedIds.size} Übungen)</p>
                <button onClick={reshuffle} className="text-sm text-neutral-500 underline">
                  Neu mischen
                </button>
              </div>

              <div className="mb-4 space-y-2">
                {matches.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => toggleSelected(ex.id)}
                    disabled={requiredIds.has(ex.id)}
                    className={clsx(
                      'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left',
                      selectedIds.has(ex.id) ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200',
                      requiredIds.has(ex.id) && 'border-amber-300 bg-amber-50'
                    )}
                  >
                    <span>
                      {ex.name}
                      <span className="ml-2 text-xs text-neutral-400">{CATEGORY_LABELS[ex.category]}</span>
                      {requiredIds.has(ex.id) && (
                        <span className="ml-2 text-xs font-medium text-amber-700">Protokoll-Übung</span>
                      )}
                    </span>
                    {selectedIds.has(ex.id) && <span className="text-sm">✓</span>}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSaveAndStart}
                disabled={saving || selectedIds.size === 0}
                className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Speichert…' : 'Training speichern & starten'}
              </button>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

export default function GeneratorPage() {
  return (
    <RequireAuth>
      <GeneratorInner />
    </RequireAuth>
  );
}
