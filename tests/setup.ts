/**
 * AI assisted with this file
 */
import 'dotenv/config';
import { createError } from 'h3';

/* ─────────────────────────────────── *
 * Nuxt auto-import polyfills
 * ─────────────────────────────────── *
 * Services in server/services/** call these as free identifiers
 * (Nuxt auto-imports them at build time). Outside the Nuxt
 * transform we expose stub implementations on globalThis so the
 * service modules load and run.
 *
 * Tests that need to assert email/sms side effects can replace
 * these globals with `vi.fn()` inside their own `beforeEach`.
 */
type RuntimeConfig = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  siteUrl: string;
  stripeSecretKey: string;
  public: { stripePublicKey: string };
};

const g = globalThis as unknown as {
  createError?: typeof createError;
  sendEmail?: (to: string, subject: string, html: string) => Promise<void>;
  sendSms?: (to: string, body: string) => Promise<void>;
  useRuntimeConfig?: () => RuntimeConfig;
};

if (typeof g.createError !== 'function') {
  g.createError = createError;
}

if (typeof g.sendEmail !== 'function') {
  g.sendEmail = async () => {};
}

if (typeof g.sendSms !== 'function') {
  g.sendSms = async () => {};
}

if (typeof g.useRuntimeConfig !== 'function') {
  g.useRuntimeConfig = () => ({
    smtpHost: process.env.SMTP_HOST ?? 'localhost',
    smtpPort: parseInt(process.env.SMTP_PORT ?? '1025'),
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPass: process.env.SMTP_PASS ?? '',
    smtpFrom: process.env.SMTP_FROM ?? 'noreply@barkside.local',
    siteUrl: process.env.SITE_URL ?? 'http://localhost:3000',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    public: { stripePublicKey: process.env.STRIPE_PUBLIC_KEY ?? '' },
  });
}
