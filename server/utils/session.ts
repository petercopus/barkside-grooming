import { createHash, randomUUID } from 'crypto';

// Generate random session token to send to client as cookie
export function generateSessionToken(): string {
  return randomUUID();
}

// Hash token before storing in db.
// **Never store raw token!
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
