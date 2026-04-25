<script setup lang="ts">
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';

const props = defineProps<{
  clientSecret: string;
}>();

const emit = defineEmits<{
  'update:complete': [complete: boolean];
}>();

const { getStripe } = useStripe();

const paymentRef = ref<HTMLDivElement>();
const errorMsg = ref('');

let stripeInstance: Stripe | null = null;
let elements: StripeElements | null = null;
let paymentElement: StripePaymentElement | null = null;

const appearance = {
  theme: 'stripe' as const,
  labels: 'above' as const,
  variables: {
    colorPrimary: '#17293a',
    colorText: '#0f1e2b',
    colorTextSecondary: '#68523a',
    colorTextPlaceholder: '#a98659',
    colorBackground: '#ffffff',
    colorDanger: '#984432',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    borderRadius: '10px',
    spacingUnit: '4px',
  },
  rules: {
    '.Label': {
      fontSize: '13px',
      fontWeight: '500',
      color: '#68523a',
    },
    '.Input': {
      border: '1px solid rgba(221, 195, 156, 0.6)',
      boxShadow: 'none',
    },
    '.Input:focus': {
      border: '1px solid #17293a',
      boxShadow: '0 0 0 1px #17293a',
    },
    '.Input--invalid': {
      border: '1px solid #984432',
    },
  },
};

onMounted(async () => {
  stripeInstance = await getStripe();
  if (!stripeInstance || !paymentRef.value) return;

  elements = stripeInstance.elements({
    clientSecret: props.clientSecret,
    appearance,
  });

  paymentElement = elements.create('payment');
  paymentElement.mount(paymentRef.value);

  paymentElement.on('change', (event) => {
    emit('update:complete', event.complete);
  });
});

onBeforeUnmount(() => {
  paymentElement?.destroy();
});

async function confirm(): Promise<string> {
  if (!stripeInstance || !elements) {
    throw new Error('Card form is not ready.');
  }

  errorMsg.value = '';

  const { error: submitError } = await elements.submit();
  if (submitError) {
    errorMsg.value = submitError.message ?? 'Please check your card details.';
    throw new Error(errorMsg.value);
  }

  const result = await stripeInstance.confirmSetup({
    elements,
    clientSecret: props.clientSecret,
    confirmParams: { return_url: window.location.href },
    redirect: 'if_required',
  });

  if (result.error) {
    errorMsg.value = result.error.message ?? 'Card setup failed.';
    throw new Error(errorMsg.value);
  }

  const setupIntent = result.setupIntent;
  if (setupIntent?.status === 'succeeded' && setupIntent.payment_method) {
    return setupIntent.payment_method as string;
  }

  errorMsg.value = 'Card setup did not complete. Please try again.';
  throw new Error(errorMsg.value);
}

defineExpose({ confirm });
</script>

<template>
  <div>
    <div ref="paymentRef" />

    <p
      v-if="errorMsg"
      class="text-sm text-error mt-3"
      role="alert">
      {{ errorMsg }}
    </p>
  </div>
</template>
