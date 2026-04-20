import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mosca Insights',
  description: 'Dashboard de análisis de encuestas — Mosca Hnos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.className}>
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
