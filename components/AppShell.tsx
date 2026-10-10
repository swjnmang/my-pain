'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import clsx from 'clsx';

function NavIcon({ name }: { name: 'home' | 'training' | 'calendar' | 'history' | 'profile' }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'home' && <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />}
      {name === 'training' && <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />}
      {name === 'calendar' && (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </>
      )}
      {name === 'history' && <path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6" />}
      {name === 'profile' && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </>
      )}
    </svg>
  );
}

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/training', label: 'Training', icon: 'training' },
  { href: '/calendar', label: 'Kalender', icon: 'calendar' },
  { href: '/history', label: 'Verlauf', icon: 'history' },
  { href: '/profile', label: 'Profil', icon: 'profile' },
] as const;

export default function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col pb-24">
      <header className="flex items-center justify-between px-5 pb-2 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <button
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
          className="rounded-lg px-2 py-2 text-sm font-medium text-neutral-500"
        >
          Abmelden
        </button>
      </header>

      <main className="flex-1 px-5 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-xs',
                  active ? 'font-bold text-accent' : 'font-medium text-neutral-500'
                )}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
