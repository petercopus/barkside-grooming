import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export function useStripe() {
  const config = useRuntimeConfig();

  function getStripe() {
    if (!stripePromise) {
      stripePromise = loadStripe(config.public.stripePublicKey);
    }

    return stripePromise;
  }

  return { getStripe };
}
