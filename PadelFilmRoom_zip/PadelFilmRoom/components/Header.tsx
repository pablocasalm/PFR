'use client';

import { useLanguage } from '@/lib/language-context';
import { Button } from './ui/button';

export function Header() {
  const { language, setLanguage, t } = useLanguage();

  const handleCTA = () => {
    window.location.href = '/signup';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#ded6c6]/80 bg-[#f6f1e8]/90 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="text-xl font-bold tracking-tight text-[#14110c] sm:text-2xl">
          {t('logoText')}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1 rounded-md border border-[#d9d1c2] bg-white/70 p-1">
            <button
              onClick={() => setLanguage('es')}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                language === 'es'
                  ? 'bg-[#1d6f5c] text-white'
                  : 'text-[#4a443b] hover:text-[#14110c]'
              }`}
              aria-label="Español"
            >
              ES
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                language === 'en'
                  ? 'bg-[#1d6f5c] text-white'
                  : 'text-[#4a443b] hover:text-[#14110c]'
              }`}
              aria-label="English"
            >
              EN
            </button>
          </div>

          <Button
            onClick={handleCTA}
            className="h-9 border border-[#1d6f5c] bg-[#1d6f5c] px-4 text-sm font-semibold text-white hover:bg-[#165447] sm:h-10 sm:px-6"
          >
            {t('ctaButton')}
          </Button>
        </div>
      </div>
    </header>
  );
}
