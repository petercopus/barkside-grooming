import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';

let transporter: Transporter | null = null;

export function initEmail() {
  const config = useRuntimeConfig();

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    ...(config.smtpUser && {
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    }),
  });

  console.log(`[email] Transporter ready (${config.smtpHost}:${config.smtpPort})`);
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    console.warn('[email] Transporter not initialized — skipping send');
    return;
  }

  const config = useRuntimeConfig();

  try {
    await transporter.sendMail({
      from: config.smtpFrom,
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error('[email] Send failed:', e);
  }
}
