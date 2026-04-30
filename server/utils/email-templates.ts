/**
 * AI assisted with this file
 */

/* ─────────────────────────────────── *
 * Email templates — vaccination upload flow
 * Inline-styled HTML; safe for nodemailer + most clients.
 * ─────────────────────────────────── */

const baseStyles = {
  wrapper:
    'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#1f1d1a;max-width:560px;margin:0 auto;padding:24px;',
  heading: 'font-size:20px;font-weight:600;margin:0 0 12px;',
  paragraph: 'font-size:14px;line-height:1.5;margin:0 0 16px;',
  button:
    'display:inline-block;background:#1f1d1a;color:#fcfaf6;padding:10px 18px;border-radius:9999px;text-decoration:none;font-size:14px;font-weight:500;',
  petBlock: 'margin:0 0 16px;padding:12px 14px;border:1px solid #e6dfd2;border-radius:8px;',
  meta: 'color:#766c5d;font-size:13px;margin:0 0 4px;',
  footer: 'color:#a39785;font-size:12px;margin-top:24px;',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(scheduledDate: string, startTime: string | null): string {
  if (!startTime) return scheduledDate;
  return `${scheduledDate} at ${startTime.slice(0, 5)}`;
}

export function renderHoldInitialEmail(opts: {
  recipientName: string;
  scheduledDate: string;
  startTime: string | null;
  expiresAt: Date;
  pets: { name: string; uploadUrl: string }[];
}): { subject: string; html: string } {
  const subject = 'Vaccination record needed for your appointment';
  const petBlocks = opts.pets
    .map(
      (p) => `
        <div style="${baseStyles.petBlock}">
          <p style="margin:0 0 8px;font-weight:600;">${escapeHtml(p.name)}</p>
          <a href="${escapeHtml(p.uploadUrl)}" style="${baseStyles.button}">Upload record</a>
        </div>`,
    )
    .join('');

  const html = `
    <div style="${baseStyles.wrapper}">
      <h1 style="${baseStyles.heading}">Hi ${escapeHtml(opts.recipientName)},</h1>
      <p style="${baseStyles.paragraph}">
        Thanks for booking with Barkside Grooming. Your appointment on
        <strong>${escapeHtml(formatDateTime(opts.scheduledDate, opts.startTime))}</strong>
        is on hold until we have a current vaccination record for the pet${
          opts.pets.length > 1 ? 's' : ''
        } below.
      </p>
      <p style="${baseStyles.paragraph}">
        Please upload by
        <strong>${escapeHtml(opts.expiresAt.toUTCString())}</strong>
        or your slot will be released.
      </p>
      ${petBlocks}
      <p style="${baseStyles.footer}">
        Each link is single-use and expires with the hold window.
      </p>
    </div>`;

  return { subject, html };
}

export function renderHoldReminderEmail(opts: {
  recipientName: string;
  scheduledDate: string;
  startTime: string | null;
  expiresAt: Date;
  pets: { name: string; uploadUrl: string }[];
}): { subject: string; html: string } {
  const subject = 'Reminder: vaccination record still needed';
  const petBlocks = opts.pets
    .map(
      (p) => `
        <div style="${baseStyles.petBlock}">
          <p style="margin:0 0 8px;font-weight:600;">${escapeHtml(p.name)}</p>
          <a href="${escapeHtml(p.uploadUrl)}" style="${baseStyles.button}">Upload record</a>
        </div>`,
    )
    .join('');

  const html = `
    <div style="${baseStyles.wrapper}">
      <h1 style="${baseStyles.heading}">Hi ${escapeHtml(opts.recipientName)},</h1>
      <p style="${baseStyles.paragraph}">
        We still haven't received vaccination records for your appointment on
        <strong>${escapeHtml(formatDateTime(opts.scheduledDate, opts.startTime))}</strong>.
        Your slot will be released after
        <strong>${escapeHtml(opts.expiresAt.toUTCString())}</strong>.
      </p>
      <p style="${baseStyles.paragraph}">
        Use the fresh link${opts.pets.length > 1 ? 's' : ''} below — earlier
        ones from the original confirmation are no longer valid.
      </p>
      ${petBlocks}
    </div>`;

  return { subject, html };
}

export function renderBookingConfirmationEmail(opts: {
  recipientName: string;
  scheduledDate: string;
  startTime: string | null;
}): { subject: string; html: string } {
  const subject = 'Your appointment is confirmed';
  const html = `
    <div style="${baseStyles.wrapper}">
      <h1 style="${baseStyles.heading}">Hi ${escapeHtml(opts.recipientName)},</h1>
      <p style="${baseStyles.paragraph}">
        Your appointment on
        <strong>${escapeHtml(formatDateTime(opts.scheduledDate, opts.startTime))}</strong>
        is confirmed. We can't wait to see you.
      </p>
      <p style="${baseStyles.paragraph}">
        If anything changes on your end, just reply to this email and we'll
        sort it out together.
      </p>
    </div>`;

  return { subject, html };
}

export function renderHoldReleasedEmail(opts: {
  recipientName: string;
  scheduledDate: string;
  startTime: string | null;
}): { subject: string; html: string } {
  const subject = 'Your appointment has been released';
  const html = `
    <div style="${baseStyles.wrapper}">
      <h1 style="${baseStyles.heading}">Hi ${escapeHtml(opts.recipientName)},</h1>
      <p style="${baseStyles.paragraph}">
        We didn't receive vaccination records in time, so your appointment on
        <strong>${escapeHtml(formatDateTime(opts.scheduledDate, opts.startTime))}</strong>
        has been released and the slot is back on the calendar.
      </p>
      <p style="${baseStyles.paragraph}">
        We'd still love to groom your pup — feel free to book a new appointment
        whenever you're ready.
      </p>
    </div>`;

  return { subject, html };
}
