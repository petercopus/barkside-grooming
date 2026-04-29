/**
 * Format a phone number string for display.
 */
export function formatPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, '');

  // strip US country code if present
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return null;
}
