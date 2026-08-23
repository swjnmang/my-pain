'use client';

import { useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  onDelete: () => void | Promise<void>;
}

const ACTION_WIDTH = 76;

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export default function SwipeToDelete({ children, onDelete }: Props) {
  const [translateX, setTranslateX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const startXRef = useRef(0);
  const startTranslateRef = useRef(0);
  const draggedRef = useRef(false);

  function handlePointerDown(e: React.PointerEvent) {
    if (deleting) return;
    startXRef.current = e.clientX;
    startTranslateRef.current = translateX;
    draggedRef.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const delta = e.clientX - startXRef.current;
    if (Math.abs(delta) > 4) draggedRef.current = true;
    const next = Math.min(0, Math.max(-ACTION_WIDTH, startTranslateRef.current + delta));
    setTranslateX(next);
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    setTranslateX(translateX < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0);
  }

  function handleContentClickCapture(e: React.MouseEvent) {
    if (draggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggedRef.current = false;
      return;
    }
    if (translateX < 0) {
      e.preventDefault();
      e.stopPropagation();
      setTranslateX(0);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  const revealProgress = Math.min(1, Math.abs(translateX) / (ACTION_WIDTH * 0.6));

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: ACTION_WIDTH }}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex flex-1 items-center justify-center bg-red-600 text-white disabled:opacity-60"
          style={{ opacity: revealProgress }}
          aria-label="Training löschen"
        >
          <TrashIcon />
        </button>
      </div>
      <div
        className="relative bg-white"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? 'none' : 'transform 200ms ease-out',
          touchAction: 'pan-y',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleContentClickCapture}
      >
        {children}
      </div>
    </div>
  );
}
