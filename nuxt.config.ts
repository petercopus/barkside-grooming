// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],

  runtimeConfig: {
    smtpHost: process.env.SMTP_HOST ?? 'localhost',
    smtpPort: parseInt(process.env.SMTP_PORT ?? '1025'),
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPass: process.env.SMTP_PASS ?? '',
    smtpFrom: process.env.SMTP_FROM ?? 'noreply@barkside.local',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    public: {
      stripePublicKey: process.env.STRIPE_PUBLIC_KEY ?? '',
    },
  },

  css: ['~/assets/css/main.css'],
  ui: {
    colorMode: false,
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error'],
    },
  },

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap',
        },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  icon: {
    clientBundle: {
      scan: true,
    },
  },

  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      '0 * * * *': ['send-reminders'],
    },
  },

  vite: {
    optimizeDeps: {
      include: ['@vue/devtools-core', '@vue/devtools-kit', '@internationalized/date', 'zod'],
    },
  },
});
