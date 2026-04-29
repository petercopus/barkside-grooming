<script setup lang="ts">
definePageMeta({
  layout: 'site',
  middleware: 'auth',
});

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
const cardComplete = ref(false);
const savingCard = ref(false);
const cardFormRef = ref<{ confirm: () => Promise<string> } | null>(null);

async function openAddCard() {
  loadingSetup.value = true;
  cardComplete.value = false;

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

async function saveCard() {
  if (!cardFormRef.value) return;

  savingCard.value = true;

  let stripePaymentMethodId: string;
  try {
    stripePaymentMethodId = await cardFormRef.value.confirm();
  } catch {
    savingCard.value = false;
    return;
  }

  try {
    await $fetch('/api/payment-methods', {
      method: 'POST',
      body: { stripePaymentMethodId },
    });

    showAddCard.value = false;
    setupClientSecret.value = '';
    cardComplete.value = false;

    await refreshPMs();
    toast.add({ title: 'Card added', color: 'success' });
  } catch {
    toast.add({ title: 'Failed to save card', color: 'error' });
  } finally {
    savingCard.value = false;
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

function brandIcon(brand: string): string {
  const b = brand?.toLowerCase() ?? '';

  if (b.includes('visa')) return 'i-simple-icons-visa';
  if (b.includes('master')) return 'i-simple-icons-mastercard';
  if (b.includes('amex') || b.includes('american')) return 'i-simple-icons-americanexpress';
  if (b.includes('discover')) return 'i-simple-icons-discover';

  return 'i-lucide-credit-card';
}

function expState(month: number, year: number): 'expired' | 'expiring' | 'ok' {
  const now = new Date();
  const cardEnd = new Date(year, month, 1); // first of month after exp
  const monthsLeft =
    (cardEnd.getFullYear() - now.getFullYear()) * 12 + (cardEnd.getMonth() - now.getMonth());

  if (monthsLeft <= 0) return 'expired';
  if (monthsLeft <= 2) return 'expiring';

  return 'ok';
}
</script>

<template>
  <AppSectionPanel
    kicker="Payment"
    title="Saved cards"
    description="Stored securely with Stripe — used for checkout and tips."
    icon="i-lucide-credit-card">
    <template #actions>
      <UButton
        label="Add card"
        icon="i-lucide-plus"
        size="sm"
        :loading="loadingSetup"
        @click="openAddCard" />
    </template>

    <div
      v-if="paymentMethods.length === 0"
      class="rounded-2xl border border-dashed border-default bg-bone-100/40 px-6 py-10 text-center">
      <span
        class="inline-flex size-14 items-center justify-center rounded-2xl bg-primary-100/70 text-primary-600 mb-4 shadow-sm">
        <UIcon
          name="i-lucide-credit-card"
          class="size-6" />
      </span>
      <p class="font-display-soft text-2xl text-barkside-900 leading-tight">No cards on file</p>
      <p class="text-sm text-muted mt-2 max-w-md mx-auto">
        Add a card to speed through checkout. We never store your card number — Stripe handles the
        secure stuff.
      </p>

      <UButton
        label="Add a card"
        icon="i-lucide-plus"
        size="lg"
        class="mt-5"
        :loading="loadingSetup"
        @click="openAddCard" />
    </div>

    <div
      v-else
      class="space-y-3">
      <article
        v-for="pm in paymentMethods"
        :key="pm.id"
        class="rounded-2xl border border-default/70 bg-white/70 px-4 py-4 sm:px-5 shadow-sm transition hover:shadow-md">
        <div class="flex flex-wrap items-center gap-4">
          <span
            class="inline-flex size-12 items-center justify-center rounded-xl bg-primary-100/70 text-primary-700 shrink-0">
            <UIcon
              :name="brandIcon(pm.brand)"
              class="size-6" />
          </span>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-medium text-default capitalize">{{ pm.brand }}</p>
              <span class="text-default tabular-nums">•••• {{ pm.last4 }}</span>

              <UBadge
                v-if="pm.isDefault"
                color="primary"
                variant="subtle"
                size="xs"
                label="Default" />
              <UBadge
                v-if="expState(pm.expMonth, pm.expYear) === 'expired'"
                color="error"
                variant="subtle"
                size="xs"
                label="Expired" />
              <UBadge
                v-else-if="expState(pm.expMonth, pm.expYear) === 'expiring'"
                color="warning"
                variant="subtle"
                size="xs"
                label="Expiring soon" />
            </div>

            <p class="text-xs text-muted mt-0.5 tabular-nums">
              Expires {{ String(pm.expMonth).padStart(2, '0') }}/{{ String(pm.expYear).slice(-2) }}
            </p>
          </div>

          <div class="flex gap-1 shrink-0">
            <UButton
              v-if="!pm.isDefault"
              label="Set default"
              variant="ghost"
              size="sm"
              @click="makeDefault(pm.id)" />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="sm"
              aria-label="Remove card"
              @click="removeCard(pm.id)" />
          </div>
        </div>
      </article>
    </div>

    <p class="mt-5 text-xs text-muted flex items-center gap-1.5">
      <UIcon
        name="i-lucide-lock"
        class="size-3.5 text-primary-500" />
      Stored & encrypted by Stripe — we never see your full card number.
    </p>

    <!-- Add card modal -->
    <UModal
      v-model:open="showAddCard"
      title="Add payment method">
      <template #body>
        <div v-if="setupClientSecret">
          <PaymentCardForm
            ref="cardFormRef"
            :client-secret="setupClientSecret"
            @update:complete="cardComplete = $event" />

          <UButton
            label="Save card"
            class="mt-4"
            size="lg"
            block
            icon="i-lucide-check"
            :loading="savingCard"
            :disabled="!cardComplete"
            @click="saveCard" />
        </div>
      </template>
    </UModal>
  </AppSectionPanel>
</template>
