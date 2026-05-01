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
        Use the fresh link${opts.pets.length > 1 ? 's' : ''} below — earlier ones from the original confirmation are no longer valid.
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
        <strong>${escapeHtml(formatDateTime(opts.scheduledDate, opts.startTime))}</strong> is confirmed. We can't wait to see you.
      </p>
      <p style="${baseStyles.paragraph}">
        If anything changes on your end, just reply to this email and we'll sort it out together.
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
        We'd still love to groom your pup — feel free to book a new appointment whenever you're ready.
      </p>
    </div>`;

  return { subject, html };
}

/* ─────────────────────────────────── *
 * Email templates: appointment lifecycle
 * ─────────────────────────────────── */
export function renderAppointmentReminderEmail(opts: {
  recipientName: string;
  scheduledDate: string;
  startTime: string | null;
}): { subject: string; html: string } {
  const subject = 'Reminder: your appointment is tomorrow';
  const html = `
    <div style="${baseStyles.wrapper}">
      <h1 style="${baseStyles.heading}">Hi ${escapeHtml(opts.recipientName)},</h1>
      <p style="${baseStyles.paragraph}">
        Just a quick reminder that your appointment is on <strong>${escapeHtml(formatDateTime(opts.scheduledDate, opts.startTime))}</strong>.
      </p>
      <p style="${baseStyles.paragraph}">
        Reply to this email if anything has changed and we'll sort it out together.
      </p>
    </div>`;

  return { subject, html };
}

export function renderAdminNewBookingEmail(opts: {
  customerName: string;
  isGuest: boolean;
  scheduledDate: string;
  startTime: string | null;
}): { subject: string; html: string } {
  const subject = 'New booking received';
  const guestSuffix = opts.isGuest ? ' (Guest)' : '';
  const html = `
    <div style="${baseStyles.wrapper}">
      <h1 style="${baseStyles.heading}">New booking</h1>
      <p style="${baseStyles.paragraph}">
        <strong>${escapeHtml(opts.customerName)}${guestSuffix}</strong> booked an appointment for <strong>${escapeHtml(formatDateTime(opts.scheduledDate, opts.startTime))}</strong>.
      </p>
      <p style="${baseStyles.footer}">
        Open the admin dashboard to review the booking.
      </p>
    </div>`;

  return { subject, html };
}

export function renderAppointmentCancelledEmail(opts: {
  recipientName: string;
  scheduledDate: string;
  startTime: string | null;
}): { subject: string; html: string } {
  const subject = 'Your appointment has been cancelled';
  const html = `
    <div style="${baseStyles.wrapper}">
      <h1 style="${baseStyles.heading}">Hi ${escapeHtml(opts.recipientName)},</h1>
      <p style="${baseStyles.paragraph}">
        Your appointment on
        <strong>${escapeHtml(formatDateTime(opts.scheduledDate, opts.startTime))}</strong> has been cancelled.
      </p>
      <p style="${baseStyles.paragraph}">
        Whenever you're ready to rebook, we'd love to have you back.
      </p>
    </div>`;

  return { subject, html };
}

export function renderAppointmentStatusChangedEmail(opts: {
  recipientName: string;
  status: string;
  scheduledDate: string;
  startTime: string | null;
}): { subject: string; html: string } {
  const subject = 'Your appointment was updated';
  const html = `
    <div style="${baseStyles.wrapper}">
      <h1 style="${baseStyles.heading}">Hi ${escapeHtml(opts.recipientName)},</h1>
      <p style="${baseStyles.paragraph}">
        Your appointment on
        <strong>${escapeHtml(formatDateTime(opts.scheduledDate, opts.startTime))}</strong> is now <strong>${escapeHtml(opts.status)}</strong>.
      </p>
      <p style="${baseStyles.paragraph}">
        Reply to this email if you have any questions.
      </p>
    </div>`;

  return { subject, html };
}

export function renderDocumentRequestEmail(opts: {
  recipientName: string;
  documentTypeLabel: string;
  petName: string | null;
  message: string | null;
  dueDate: string | null;
}): { subject: string; html: string } {
  const subject = `Action needed: ${opts.documentTypeLabel} request`;
  const petLine = opts.petName
    ? `<p style="${baseStyles.meta}">For: <strong>${escapeHtml(opts.petName)}</strong></p>`
    : '';
  const messageBlock = opts.message
    ? `<p style="${baseStyles.paragraph}">${escapeHtml(opts.message)}</p>`
    : '';
  const dueLine = formatDate(opts.dueDate, 'long')
    ? `<p style="${baseStyles.meta}">Please respond by <strong>${escapeHtml(opts.dueDate ?? '')}</strong>.</p>`
    : '';

  const html = `
    <div style="${baseStyles.wrapper}">
      <h1 style="${baseStyles.heading}">Hi ${escapeHtml(opts.recipientName)},</h1>
      <p style="${baseStyles.paragraph}">
        We've requested a <strong>${escapeHtml(opts.documentTypeLabel)}</strong> from you.
      </p>
      ${petLine}
      ${messageBlock}
      ${dueLine}
      <p style="${baseStyles.paragraph}">
        You can upload it from your documents page when you're ready.
      </p>
    </div>`;

  return { subject, html };
}

export function renderPaymentRefundedEmail(opts: {
  recipientName: string;
  amountCents: number;
  isFullRefund: boolean;
}): { subject: string; html: string } {
  const subject = opts.isFullRefund ? 'Refund issued' : 'Partial refund issued';
  const formatted = `$${(opts.amountCents / 100).toFixed(2)}`;
  const html = `
    <div style="${baseStyles.wrapper}">
      <h1 style="${baseStyles.heading}">Hi ${escapeHtml(opts.recipientName)},</h1>
      <p style="${baseStyles.paragraph}">
        ${
          opts.isFullRefund
            ? `Your appointment has been fully refunded — <strong>${escapeHtml(formatted)}</strong> will return to your card.`
            : `A refund of <strong>${escapeHtml(formatted)}</strong> has been issued to your card.`
        }
      </p>
      <p style="${baseStyles.footer}">
        It can take a few business days for the refund to appear on your statement.
      </p>
    </div>`;

  return { subject, html };
}

/* ─────────────────────────────────── *
 * Email templates: account lifecycle
 * ─────────────────────────────────── */
export function renderWelcomeEmail(opts: { recipientName: string; bookingUrl: string }): {
  subject: string;
  html: string;
} {
  const subject = 'Welcome to Barkside Grooming';
  const html = `
    <div style="${baseStyles.wrapper}">
      <h1 style="${baseStyles.heading}">Hi ${escapeHtml(opts.recipientName)},</h1>
      <p style="${baseStyles.paragraph}">
        Thanks for creating an account with Barkside Grooming. We're so happy
        to have you and your pup with us.
      </p>
      <p style="${baseStyles.paragraph}">
        Whenever you're ready, you can book your first appointment below.
        We'll keep your details on file so future visits are even quicker.
      </p>
      <p style="${baseStyles.paragraph}">
        <a href="${escapeHtml(opts.bookingUrl)}" style="${baseStyles.button}">Book an appointment</a>
      </p>
      <p style="${baseStyles.footer}">
        Reply to this email any time — we love hearing from new families.
      </p>
    </div>`;

  return { subject, html };
}

export function renderPasswordResetEmail(opts: {
  recipientName: string;
  resetUrl: string;
  expiresAt: Date;
}): { subject: string; html: string } {
  const subject = 'Reset your Barkside Grooming password';
  const html = `
    <div style="${baseStyles.wrapper}">
      <h1 style="${baseStyles.heading}">Hi ${escapeHtml(opts.recipientName)},</h1>
      <p style="${baseStyles.paragraph}">
        We received a request to reset your password. Use the link below to choose a new one.
      </p>
      <p style="${baseStyles.paragraph}">
        <a href="${escapeHtml(opts.resetUrl)}" style="${baseStyles.button}">Reset password</a>
      </p>
      <p style="${baseStyles.meta}">
        This link expires at <strong>${escapeHtml(opts.expiresAt.toUTCString())}</strong> and can only be used once.
      </p>
      <p style="${baseStyles.footer}">
        If you didn't request this, you can safely ignore this email — your password won't change.
      </p>
    </div>`;

  return { subject, html };
}
