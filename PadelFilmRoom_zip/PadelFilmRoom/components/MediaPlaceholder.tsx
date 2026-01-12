'use client';

import { Play } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type MediaPlaceholderProps = {
  className?: string;
};

export function MediaPlaceholder({ className }: MediaPlaceholderProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={cn(
        'relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_30px_80px_rgba(0,0,0,0.4)]',
        className
      )}
      aria-label="Espacio para vídeo o teaser"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
      <div className="absolute inset-0 opacity-40">
        <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-6 right-0 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" />
      </div>
      <div className="relative flex flex-col items-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80">
          <Play className="h-6 w-6" />
        </span>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          Espacio para vídeo/teaser
        </p>
      </div>
    </motion.div>
  );
}
