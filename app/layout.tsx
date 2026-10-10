import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' });

export const metadata: Metadata = {
  title: 'my-pain',
  description: 'Training & Schmerz-Tracking',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={figtree.variable}>
      <body className="antialiased bg-neutral-50 font-sans text-neutral-900 min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
