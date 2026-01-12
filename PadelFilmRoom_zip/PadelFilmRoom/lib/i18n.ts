export const translations = {
  es: {
    // Header
    logoText: 'Padel Film Room',
    ctaButton: 'Accede antes que nadie',

    // Hero
    heroTitle: 'Deja de copiar golpes. Empieza a copiar decisiones.',
    heroSubtitle: 'Análisis táctico de pádel profesional. Entiende por qué se gana cada punto.',
    heroCtaTitle: 'Accede antes que nadie',
    emailPlaceholder: 'Email',
    heroCtaButton: 'Únete a la lista privada',
    emailMicrocopy: 'Contenido gratuito, acceso anticipado y mucho más, muy pronto.',

    // Sections
    sectionMysteryTitle: 'No es otro canal de pádel',
    sectionMysteryLine1: 'Aquí no analizamos golpes aislados.',
    sectionMysteryLine2:
      'Analizamos decisiones, contextos y patrones reales del pádel profesional.',
    sectionMysteryLine3: 'Lo importante no es qué golpe se ejecuta, sino por qué se elige.',
    sectionContentTitle: '¿Qué tipo de contenido estamos creando?',
    sectionContentBullet1: 'Análisis reales de puntos profesionales',
    sectionContentBullet2: 'Decisiones tácticas explicadas con contexto',
    sectionContentBullet3: 'Lectura del juego: antes, durante y después del punto',
    sectionContentBullet4: 'Contenido corto, directo y accionable',
    sectionContentClose:
      'Contenido para jugadores que quieren entender y aprender del juego, no solo verlo.',
    sectionChannelsTitle: 'El contenido empezará a aparecer muy pronto',
    sectionChannelsText:
      'Iremos publicando análisis, clips y reflexiones en nuestros canales. Si te interesa este enfoque, síguenos y estate atento.',
    sectionChannelsCtaYoutube: 'Síguenos en YouTube',
    sectionChannelsCtaInstagram: 'Síguenos en Instagram',
    sectionChannelsMicrocopy: 'Todo empieza ahí. Lo importante vendrá después.',
    sectionHypeTitle: 'Esto es solo el principio',
    sectionHypeText:
      'Estamos construyendo algo para jugadores que quieren pensar mejor cada punto.',
    sectionHypeText2:
      'La lista de correo tendrá acceso anticipado, contenido exclusivo y prioridad cuando lancemos lo que viene.',
    sectionHypeCtaTitle: 'Apúntate antes del lanzamiento',
    sectionHypeCtaButton: 'Quiero estar dentro',

    // FAQ
    faqTitle: 'Preguntas frecuentes',
    faq1Q: '¿Es solo para profesionales?',
    faq1A: 'No. Es para jugadores que quieren mejorar su comprensión del juego.',
    faq2Q: '¿Cuándo se lanza todo?',
    faq2A: 'Muy pronto. La lista de correo será la primera en saberlo.',
    faq3Q: '¿Habrá contenido gratuito?',
    faq3A: 'Sí. Siempre habrá contenido abierto y contenido más profundo.',

    // Footer
    footerTagline: 'Análisis de pádel. Decisiones reales.',

    // Toast
    thanksMessage: 'Gracias — te enviaremos el acceso',
  },
  en: {
    // Header
    logoText: 'Padel Film Room',
    ctaButton: 'Get early access',

    // Hero
    heroTitle: 'Stop copying strokes. Start copying decisions.',
    heroSubtitle: 'Professional padel tactical analysis. Understand why each point is won.',
    heroCtaTitle: 'Get early access',
    emailPlaceholder: 'Email',
    heroCtaButton: 'Join the private list',
    emailMicrocopy: 'Free content, early access, and much more, coming soon.',

    // Sections
    sectionMysteryTitle: 'Not just another padel channel',
    sectionMysteryLine1: 'We don\'t analyze isolated strokes.',
    sectionMysteryLine2:
      'We analyze decisions, contexts, and real patterns in pro padel.',
    sectionMysteryLine3: 'What matters isn\'t the shot, but why it\'s chosen.',
    sectionContentTitle: 'What kind of content are we creating?',
    sectionContentBullet1: 'Real analysis of pro points',
    sectionContentBullet2: 'Tactical decisions explained with context',
    sectionContentBullet3: 'Reading the game: before, during, and after the point',
    sectionContentBullet4: 'Short, direct, actionable content',
    sectionContentClose:
      'Content for players who want to understand and learn the game, not just watch it.',
    sectionChannelsTitle: 'The content will start appearing very soon',
    sectionChannelsText:
      'We\'ll publish analysis, clips, and reflections on our channels. If this approach interests you, follow us and stay tuned.',
    sectionChannelsCtaYoutube: 'Follow us on YouTube',
    sectionChannelsCtaInstagram: 'Follow us on Instagram',
    sectionChannelsMicrocopy: 'Everything starts there. The important stuff comes after.',
    sectionHypeTitle: 'This is only the beginning',
    sectionHypeText:
      'We\'re building something for players who want to think better every point.',
    sectionHypeText2:
      'The email list gets early access, exclusive content, and priority when we launch what\'s next.',
    sectionHypeCtaTitle: 'Join before launch',
    sectionHypeCtaButton: 'I want in',

    // FAQ
    faqTitle: 'Frequently Asked Questions',
    faq1Q: 'Is this only for professionals?',
    faq1A: 'No. It\'s for players who want to improve their understanding of the game.',
    faq2Q: 'When does everything launch?',
    faq2A: 'Very soon. The email list will be the first to know.',
    faq3Q: 'Will there be free content?',
    faq3A: 'Yes. There will always be open content and deeper content.',

    // Footer
    footerTagline: 'Padel analysis. Real decisions.',

    // Toast
    thanksMessage: 'Thanks — we\'ll send you access',
  },
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.es;
