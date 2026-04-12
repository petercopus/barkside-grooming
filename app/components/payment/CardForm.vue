<script setup lang="ts">
const props = defineProps<{
  clientSecret: string;
}>();

const emit = defineEmits<{
  confirmed: [paymentMethodId: string];
  error: [message: string];
}>();

const { getStripe } = useStripe();

const cardRef = ref<HTMLDivElement>();
const confirming = ref(false);
const errorMsg = ref('');

let cardElement: any = null;
let stripeInstance: any = null;

onMounted(async () => {
  stripeInstance = await getStripe();
  if (!stripeInstance || !cardRef.value) return;

  const elements = stripeInstance.elements();
  cardElement = elements.create('card');
  cardElement.mount(cardRef.value);
});

onBeforeUnmount(() => {
  cardElement?.destroy();
});

async function handleConfirm() {
  if (!stripeInstance || !cardElement) return;

  confirming.value = true;
  errorMsg.value = '';

  const result = await stripeInstance.confirmCardSetup(props.clientSecret, {
    payment_method: { card: cardElement },
  });

  confirming.value = false;

  if (result.error) {
    errorMsg.value = result.error.message ?? 'Card setup failed';
    emit('error', errorMsg.value);
  } else {
    emit('confirmed', result.setupIntent.payment_method as string);
  }
}
</script>

<template>
  <div>
    <div
      ref="cardRef"
      class="border border-default rounded-lg p-3 bg-white" />

    <UButton
      label="Confirm Card"
      :loading="confirming"
      class="mt-4"
      @click="handleConfirm" />
  </div>
</template>
