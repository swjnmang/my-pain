'use client';

interface Props {
  src: string | null;
  onClose: () => void;
}

export default function ImageLightbox({ src, onClose }: Props) {
  if (!src) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
    </div>
  );
}
