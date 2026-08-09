'use client';

import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';

function DashboardInner() {
  return (
    <AppShell title="my-pain">
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
