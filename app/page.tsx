'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { getActiveSessionDraft, clearActiveSessionDraft, ActiveSessionDraft } from '@/lib/activeSession';

function DashboardInner() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<ActiveSessionDraft | null>(null);

  useEffect(() => {
    if (!user) return;
    setDraft(getActiveSessionDraft(user.uid));
  }, [user]);

  const resumeHref = draft
    ? `/session/new?type=${draft.type}&id=${draft.id}&date=${draft.date}${draft.planId ? `&planId=${draft.planId}` : ''}`
    : '';

  return (
    <AppShell title="my-pain">
      {draft && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Laufendes Training</p>
          <p className="mb-2 text-base font-semibold">{draft.sourceName}</p>
          <div className="flex gap-2">
            <Link
              href={resumeHref}
              className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-center text-sm font-medium text-white"
            >
              Fortsetzen
            </Link>
            <button
              onClick={() => {
                if (!user) return;
                clearActiveSessionDraft(user.uid);
                setDraft(null);
              }}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              Verwerfen
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Link
          href="/training"
          className="block rounded-lg bg-neutral-900 px-4 py-3 text-center text-base font-medium text-white"
        >
          Training starten
        </Link>

        <Link
          href="/calendar"
          className="block rounded-lg border border-neutral-300 px-4 py-3 text-center text-base font-medium"
        >
          Training planen
        </Link>

        <Link
          href="/history"
          className="block rounded-lg border border-neutral-300 px-4 py-3 text-center text-base font-medium"
        >
          Meine letzten Trainings
        </Link>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}
