'use client';

import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';

function DashboardInner() {
  return (
    <AppShell title="my-pain">
      <Link
        href="/training"
        className="block rounded-lg bg-neutral-900 px-4 py-3 text-center text-base font-medium text-white"
      >
        Training starten
      </Link>
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
