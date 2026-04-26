import Stripe from 'stripe';
import { ZodError } from 'zod';

/**
 * Nitro calls this hook before serializing an error
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error: any) => {
    const cause = error?.cause ?? error;

    if (cause instanceof ZodError) {
      error.statusCode = 400;
      error.statusMessage = 'Invalid input';
      error.data = { issues: cause.issues };
      error.unhandled = false;
      /* Detach the cause so the dev error renderer (youch) doesn't try to
       * source-map the original ZodError stack — that path triggers a wasm
       * panic in source-map and floods the dev console. */
      error.cause = undefined;
      return;
    }

    if (cause instanceof Stripe.errors.StripeInvalidRequestError) {
      error.statusCode = cause.statusCode === 404 ? 404 : 400;
      error.statusMessage = cause.message;
      error.data = { code: cause.code, param: cause.param };
      error.unhandled = false;
      error.cause = undefined;
      return;
    }
  });
});
