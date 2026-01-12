'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';

export function Trending() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast({
        title: t('thanksMessage'),
        duration: 3000,
      });
      setTimeout(() => {
        window.location.href = '/signup';
      }, 1500);
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#fbf7f1] py-16 sm:py-20 lg:py-24">
      <div className="absolute inset-0 bg-paper-grid opacity-25" />
      <div className="absolute inset-0 bg-paper-noise opacity-40" />
      <div className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-[#1d6f5c]/30 to-transparent" />
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 sm:gap-12">
          <div className="relative overflow-hidden rounded-3xl border border-[#e3dacc] bg-white p-6 sm:p-10 shadow-ink-soft">
            <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#e58a4b]/15 blur-3xl" />
            <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#7a6f61]">
              <span className="h-2 w-2 rounded-full bg-[#1d6f5c]" />
              01
            </div>
            <h2 className="mb-4 text-2xl font-semibold text-[#14110c] sm:text-3xl lg:text-4xl">
              {t('sectionMysteryTitle')}
            </h2>
            <div className="space-y-3 text-sm text-[#3b352c] sm:text-base lg:text-lg">
              <p>{t('sectionMysteryLine1')}</p>
              <p>{t('sectionMysteryLine2')}</p>
              <p className="text-[#14110c]">{t('sectionMysteryLine3')}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-[#e3dacc] bg-white p-6 sm:p-8 shadow-ink-soft">
              <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#7a6f61]">
                <span className="h-2 w-2 rounded-full bg-[#1d6f5c]" />
                02
              </div>
              <h3 className="mb-4 text-xl font-semibold text-[#14110c] sm:text-2xl lg:text-3xl">
                {t('sectionContentTitle')}
              </h3>
              <ul className="grid gap-3 text-sm text-[#3b352c] sm:grid-cols-2 sm:text-base lg:text-lg">
                <li className="rounded-xl border border-[#efe7da] bg-[#fbf7f1] p-3">
                  {t('sectionContentBullet1')}
                </li>
                <li className="rounded-xl border border-[#efe7da] bg-[#fbf7f1] p-3">
                  {t('sectionContentBullet2')}
                </li>
                <li className="rounded-xl border border-[#efe7da] bg-[#fbf7f1] p-3">
                  {t('sectionContentBullet3')}
                </li>
                <li className="rounded-xl border border-[#efe7da] bg-[#fbf7f1] p-3">
                  {t('sectionContentBullet4')}
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-[#1d6f5c]/30 bg-gradient-to-b from-[#1d6f5c]/10 via-white to-white p-6 sm:p-8 shadow-ink-soft">
              <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#7a6f61]">
                <span className="h-2 w-2 rounded-full bg-[#1d6f5c]" />
                03
              </div>
              <p className="text-sm text-[#14110c] sm:text-base lg:text-lg">
                {t('sectionContentClose')}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#e3dacc] bg-white p-6 sm:p-8 shadow-ink-soft">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#7a6f61]">
                  <span className="h-2 w-2 rounded-full bg-[#1d6f5c]" />
                  04
                </div>
                <h3 className="mb-4 text-xl font-semibold text-[#14110c] sm:text-2xl lg:text-3xl">
                  {t('sectionChannelsTitle')}
                </h3>
                <p className="text-sm text-[#3b352c] sm:text-base lg:text-lg">
                  {t('sectionChannelsText')}
                </p>
                <p className="mt-4 text-xs text-[#8a7f71] sm:text-sm">
                  {t('sectionChannelsMicrocopy')}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  className="border-[#1d6f5c] text-[#1d6f5c] hover:bg-[#1d6f5c] hover:text-white"
                >
                  {t('sectionChannelsCtaYoutube')}
                </Button>
                <Button
                  variant="outline"
                  className="border-[#1d6f5c] text-[#1d6f5c] hover:bg-[#1d6f5c] hover:text-white"
                >
                  {t('sectionChannelsCtaInstagram')}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#e3dacc] bg-white p-6 sm:p-8 shadow-ink-soft">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#7a6f61]">
                  <span className="h-2 w-2 rounded-full bg-[#1d6f5c]" />
                  05
                </div>
                <h3 className="text-xl font-semibold text-[#14110c] sm:text-2xl lg:text-3xl">
                  {t('sectionHypeTitle')}
                </h3>
                <p className="text-sm text-[#3b352c] sm:text-base lg:text-lg">
                  {t('sectionHypeText')}
                </p>
                <p className="text-sm text-[#3b352c] sm:text-base lg:text-lg">
                  {t('sectionHypeText2')}
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-[#1d6f5c]/30 bg-[#f1f6f4] p-4 sm:p-6 shadow-ink-strong"
              >
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#1d6f5c] sm:text-base">
                  {t('sectionHypeCtaTitle')}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                  <Input
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 flex-1 border-[#c8bfb0] bg-white text-base text-[#14110c] placeholder:text-[#8a7f71] focus:border-[#1d6f5c] focus:ring-[#1d6f5c]"
                    aria-label={t('emailPlaceholder')}
                  />
                  <Button
                    type="submit"
                    className="h-12 bg-[#1d6f5c] px-6 text-base font-semibold text-white hover:bg-[#165447]"
                  >
                    {t('sectionHypeCtaButton')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
