'use client';

import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import AppShell from '@/components/AppShell';
import ProgressCharts from '@/components/ProgressCharts';

function DashboardInner() {
  return (
    <AppShell title="my-pain">
      <Link
        href="/training"
        className="mb-6 block rounded-lg bg-neutral-900 px-4 py-3 text-center text-base font-medium text-white"
      >
        Training starten
      </Link>

      <ProgressCharts />
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
