/**
 * Interruptor de los pagos en el frontend. Mientras las suscripciones no estén abiertas al
 * público, nada en la app publicada lleva a Stripe: ni contratar un plan (Precios) ni gestionar
 * o cambiar el que se tenga (portal de Stripe, desde Mi Cuenta). Los endpoints del backend
 * siguen ahí, listos.
 *
 * Solo se activa para probar, y solo si se cumplen las dos cosas a la vez:
 *  - la app corre en desarrollo (`npm run dev`) — en la versión publicada esto es siempre falso,
 *    y el código de pago ni siquiera entra en la compilación;
 *  - `.env.local` tiene `VITE_ENABLE_CHECKOUT=true`.
 * El backend puede ser el de producción (es como se prueba: frontend en local, backend
 * publicado con la clave de prueba de Stripe).
 *
 * El día que se abran los pagos, este es el único sitio que hay que cambiar (y los textos de
 * Precios.tsx, que hoy dicen "Próximamente").
 */
export const PAYMENTS_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_CHECKOUT === "true"
