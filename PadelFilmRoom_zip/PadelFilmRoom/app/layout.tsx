import './globals.css';
import type { Metadata } from 'next';
import { Fraunces, Space_Grotesk } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Padel Film Room | Análisis táctico de pádel profesional',
  description:
    'Análisis táctico de pádel profesional para entender decisiones reales. Únete a la lista privada y recibe acceso anticipado.',
  keywords:
    'pádel táctica, análisis de pádel, decisiones en pádel, pádel profesional, estrategia pádel, lectura del juego',
  openGraph: {
    title: 'Padel Film Room | Análisis táctico de pádel profesional',
    description:
      'Análisis táctico de pádel profesional para entender decisiones reales. Únete a la lista privada y recibe acceso anticipado.',
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Padel Film Room | Análisis táctico de pádel profesional',
    description:
      'Análisis táctico de pádel profesional para entender decisiones reales. Únete a la lista privada y recibe acceso anticipado.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${fraunces.variable} font-body bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
