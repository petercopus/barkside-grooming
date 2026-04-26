import 'dotenv/config';
import { createError } from 'h3';

// Nuxt auto-imports `createError` globally in production code.
// For unit tests we expose the same h3 helper on globalThis.
const g = globalThis as unknown as { createError?: typeof createError };
if (typeof g.createError !== 'function') {
  g.createError = createError;
}
