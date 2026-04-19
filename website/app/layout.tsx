import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'pkgfolio — your npm package portfolio',
  description:
    'Lifetime and recent downloads across every npm package you maintain, laid out as a portfolio.',
  openGraph: {
    title: 'pkgfolio',
    description: 'Your npm package portfolio, in one page.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#F4F1EA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
