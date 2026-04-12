<script setup lang="ts">
const toast = useToast();
const confirm = useConfirmDialog();

// fetch saved cards
const { data: pmData, refresh: refreshPMs } = await useFetch<{ paymentMethods: any[] }>(
  '/api/payment-methods',
);

const paymentMethods = computed(() => pmData.value?.paymentMethods ?? []);

// Add card modal
const showAddCard = ref(false);
const setupClientSecret = ref('');
const loadingSetup = ref(false);

async function openAddCard() {
  loadingSetup.value = true;

  try {
    const res = await $fetch<{ clientSecret: string }>('/api/payment-methods/setup-intent', {
      method: 'POST',
    });

    setupClientSecret.value = res.clientSecret;
    showAddCard.value = true;
  } catch {
    toast.add({ title: 'Failed to launch card setup', color: 'error' });
  } finally {
    loadingSetup.value = false;
  }
}

async function onCardConfirmed(stripePaymentMethodId: string) {
  try {
    await $fetch('/api/payment-methods', {
      method: 'POST',
      body: { stripePaymentMethodId },
    });

    showAddCard.value = false;
    setupClientSecret.value = '';

    await refreshPMs();
    toast.add({ title: 'Card added', color: 'success' });
  } catch {
    toast.add({ title: 'Failed to save card', color: 'error' });
  }
}

async function removeCard(id: string) {
  const ok = await confirm({
    title: 'Remove this card?',
    description: 'This card will no longer be available for payments.',
    confirmLabel: 'Remove',
    confirmColor: 'error',
  });

  if (!ok) return;

  try {
    await $fetch(`/api/payment-methods/${id}`, { method: 'DELETE' });
    await refreshPMs();
    toast.add({ title: 'Card removed', color: 'success' });
  } catch {
    toast.add({ title: 'Failed to remove card', color: 'error' });
  }
}

async function makeDefault(id: string) {
  try {
    await $fetch(`/api/payment-methods/${id}/default`, { method: 'PATCH' });
    await refreshPMs();
  } catch {
    toast.add({ title: 'Failed to set default', color: 'error' });
  }
}
</script>

<template>
  <div class="py-4">
    <AppSection title="Saved Cards">
      <template #actions>
        <UButton
          label="Add Card"
          icon="i-lucide-plus"
          size="sm"
          :loading="loadingSetup"
          @click="openAddCard" />
      </template>

      <div
        v-if="paymentMethods.length === 0"
        class="text-sm text-muted py-4">
        No saved payment methods.
      </div>

      <div
        v-else
        class="divide-y divide-default">
        <div
          v-for="pm in paymentMethods"
          :key="pm.id"
          class="flex items-center justify-between py-4 gap-4">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium capitalize">{{ pm.brand }}</span>
            <span class="text-sm text-muted">•••• {{ pm.last4 }}</span>
            <span class="text-sm text-muted">{{ pm.expMonth }}/{{ pm.expYear }}</span>
            <UBadge
              v-if="pm.isDefault"
              color="primary"
              variant="subtle"
              size="sm">
              Default
            </UBadge>
          </div>

          <div class="flex gap-2">
            <UButton
              v-if="!pm.isDefault"
              label="Set Default"
              variant="ghost"
              size="xs"
              @click="makeDefault(pm.id)" />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              @click="removeCard(pm.id)" />
          </div>
        </div>
      </div>
    </AppSection>

    <!-- Add card modal -->
    <UModal
      v-model:open="showAddCard"
      title="Add Payment Method">
      <template #body>
        <PaymentCardForm
          v-if="setupClientSecret"
          :client-secret="setupClientSecret"
          @confirmed="onCardConfirmed"
          @error="(msg: string) => toast.add({ title: msg, color: 'error' })" />
      </template>
    </UModal>
  </div>
</template>
