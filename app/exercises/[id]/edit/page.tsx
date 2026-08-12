'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import clsx from 'clsx';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import ColumnsEditor from '@/components/ColumnsEditor';
import ImageLightbox from '@/components/ImageLightbox';
import { useAuth } from '@/lib/AuthContext';
import { getUserExercise, updateUserExercise } from '@/lib/data';
import { defaultColumns } from '@/lib/columns';
import { resizeImageToDataUrl } from '@/lib/image';
import { Category, CATEGORY_LABELS, Column, PainArea, PAIN_AREA_LABELS } from '@/lib/types';

const CATEGORIES: Category[] = ['oberkoerper', 'unterkoerper', 'ganzkoerper', 'warmup'];
const PAIN_AREAS: PainArea[] = ['ruecken', 'nacken_schulter', 'huefte', 'knie', 'achillessehne', 'plantarfaszie'];
const MAX_IMAGES = 3;

function EditExerciseInner() {
  const { user } = useAuth();
  const router = useRouter();
  const routeParams = useParams();
  const exerciseId = routeParams.id as string;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('oberkoerper');
  const [columns, setColumns] = useState<Column[]>(defaultColumns());
  const [videoUrl, setVideoUrl] = useState('');
  const [painAreas, setPainAreas] = useState<Set<PainArea>>(new Set());
  const [images, setImages] = useState<string[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !exerciseId) return;
    getUserExercise(user.uid, exerciseId)
      .then((ex) => {
        if (!ex) {
          setError('Übung nicht gefunden.');
          return;
        }
        setName(ex.name);
        setCategory(ex.category);
        setColumns(ex.columns);
        setVideoUrl(ex.videoUrl ?? '');
        setPainAreas(new Set(ex.painAreas ?? []));
        setImages(ex.images ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, [user, exerciseId]);

  function togglePainArea(area: PainArea) {
    setPainAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setProcessingImages(true);
    setError(null);
    try {
      const room = MAX_IMAGES - images.length;
      const toProcess = files.slice(0, room);
      const dataUrls = await Promise.all(toProcess.map(resizeImageToDataUrl));
      setImages((prev) => [...prev, ...dataUrls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bild konnte nicht verarbeitet werden.');
    } finally {
      setProcessingImages(false);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!user || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateUserExercise(user.uid, exerciseId, {
        name: name.trim(),
        category,
        columns,
        ...(videoUrl.trim() ? { videoUrl: videoUrl.trim() } : {}),
        ...(images.length > 0 ? { images } : {}),
        ...(painAreas.size > 0 ? { painAreas: Array.from(painAreas) } : {}),
      });
      router.replace('/training/builder');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Übung bearbeiten">
      {loading && <p className="text-sm text-neutral-500">Lädt…</p>}

      {!loading && (
        <div className="space-y-6 pb-8">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Nordic Hamstring Curl"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Kategorie</label>
            <div className="flex gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={clsx(
                    'flex-1 rounded-full px-3 py-1.5 text-sm',
                    category === c ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
                  )}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Spalten</label>
            <ColumnsEditor columns={columns} onChange={setColumns} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Hilft bei Schmerzen in (optional)</label>
            <div className="flex flex-wrap gap-2">
              {PAIN_AREAS.map((area) => (
                <button
                  key={area}
                  onClick={() => togglePainArea(area)}
                  className={clsx(
                    'rounded-full px-3 py-1.5 text-xs',
                    painAreas.has(area) ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
                  )}
                >
                  {PAIN_AREA_LABELS[area]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">YouTube-Link (optional)</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/..."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Bilder (optional, max. {MAX_IMAGES})</label>
            {images.length > 0 && (
              <div className="mb-2 flex gap-2">
                {images.map((src, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      onClick={() => setZoomSrc(src)}
                      className="h-20 w-20 cursor-pointer rounded-lg object-cover"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {images.length < MAX_IMAGES && (
              <div className="flex gap-2">
                <label className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-2 text-sm">
                  Aus Galerie
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    disabled={processingImages}
                    className="hidden"
                  />
                </label>
                <label className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-2 text-sm">
                  Foto aufnehmen
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageSelect}
                    disabled={processingImages}
                    className="hidden"
                  />
                </label>
              </div>
            )}
            {processingImages && <p className="mt-1 text-xs text-neutral-400">Bilder werden verkleinert…</p>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Speichert…' : 'Änderungen speichern'}
          </button>
        </div>
      )}
      <ImageLightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />
    </AppShell>
  );
}

export default function EditExercisePage() {
  return (
    <RequireAuth>
      <EditExerciseInner />
    </RequireAuth>
  );
}
