<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'booking:read:all',
});

const route = useRoute();
const id = route.params.id as string;

const { data, refresh: refreshAppointment } = await useFetch(`/api/admin/appointments/${id}`);

if (!data.value?.appointment) {
  throw createError({ statusCode: 404, message: 'Appointment not found' });
}

const appointment = computed(() => data.value!.appointment!);
const apptStatus = computed(() => appointment.value.status as AppointmentStatus);

function petSubtotal(pet: any): number {
  const services =
    pet.services?.reduce((sum: number, s: any) => sum + s.priceAtBookingCents, 0) ?? 0;
  const addons = pet.addons?.reduce((sum: number, a: any) => sum + a.priceAtBookingCents, 0) ?? 0;
  const discount =
    pet.bundles?.reduce((sum: number, b: any) => sum + b.discountAppliedCents, 0) ?? 0;

  return services + addons - discount;
}

const grandTotal = computed(() =>
  (appointment.value.pets ?? []).reduce((sum: number, pet: any) => sum + petSubtotal(pet), 0),
);

const headerDate = computed(() => {
  const dates = (appointment.value.pets ?? [])
    .map((p: any) => p.scheduledDate)
    .filter(Boolean)
    .sort();
  return dates[0] ?? appointment.value.createdAt;
});

const toast = useToast();
const confirm = useConfirmDialog();

const updatingStatus = ref(false);

async function updateStatus(newStatus: AppointmentStatus) {
  updatingStatus.value = true;

  try {
    await $fetch(`/api/admin/appointments/${id}/status`, {
      method: 'PATCH',
      body: { status: newStatus },
    });

    await refreshAppointment();
  } catch (err: any) {
    toast.add({
      title: 'Failed to update status',
      description: err?.data?.message,
      color: 'error',
    });
  } finally {
    updatingStatus.value = false;
  }
}

async function markNoShow() {
  const ok = await confirm({
    title: 'Mark as no-show?',
    description: 'The customer will be notified.',
    confirmLabel: 'Mark No-show',
    confirmColor: 'error',
  });
  if (!ok) return;

  await updateStatus('no_show');
}

async function cancelAppointment() {
  const ok = await confirm({
    title: 'Cancel this appointment?',
    description: 'The customer will be notified.',
    confirmLabel: 'Cancel Appointment',
    confirmColor: 'error',
  });
  if (!ok) return;

  await updateStatus('cancelled');
}

const INVOICE_STATUSES: string[] = ['in_progress', 'completed'] satisfies AppointmentStatus[];

const LINE_ITEM_TYPE_ITEMS = [
  { label: 'Service', value: 'service' },
  { label: 'Addon', value: 'addon' },
  { label: 'Discount', value: 'bundle_discount' },
  { label: 'Adjustment', value: 'adjustment' },
];

const { data: invoiceData, refresh: refreshInvoice } = await useFetch(
  `/api/admin/appointments/${id}/invoice`,
);
const invoice = computed(() => invoiceData.value?.invoice ?? null);

const editableLineItems = ref<{ description: string; amountCents: number; type: string }[]>([]);
const saving = ref(false);
const generating = ref(false);

watch(
  invoice,
  (inv) => {
    if (inv?.lineItems) {
      editableLineItems.value = inv.lineItems.map((li: any) => ({
        description: li.description,
        amountCents: li.amountCents,
        type: li.type,
      }));
    }
  },
  { immediate: true },
);

async function genInvoice() {
  generating.value = true;
  try {
    await $fetch(`/api/admin/appointments/${id}/invoice`, { method: 'POST' });
    await refreshInvoice();
  } catch {
    toast.add({ title: 'Failed to generate invoice', color: 'error' });
  } finally {
    generating.value = false;
  }
}

function addAdjustment() {
  editableLineItems.value.push({ description: '', amountCents: 0, type: 'adjustment' });
}

function removeLineItem(index: number) {
  editableLineItems.value.splice(index, 1);
}

async function saveLineItems() {
  saving.value = true;
  try {
    await $fetch(`/api/admin/invoices/${invoice.value!.id}/line-items`, {
      method: 'PUT',
      body: { lineItems: editableLineItems.value },
    });
    await refreshInvoice();
    toast.add({ title: 'Invoice updated', color: 'success' });
  } catch {
    toast.add({ title: 'Failed to save changes', color: 'error' });
  } finally {
    saving.value = false;
  }
}

async function finalize() {
  const ok = await confirm({
    title: 'Finalize this invoice?',
    description: 'No further edits will be allowed.',
    confirmLabel: 'Finalize',
    confirmColor: 'primary',
  });

  if (!ok) return;

  try {
    await $fetch(`/api/admin/invoices/${invoice.value!.id}/finalize`, { method: 'PATCH' });
    await refreshInvoice();
    toast.add({ title: 'Invoice finalized', color: 'success' });
  } catch {
    toast.add({ title: 'Failed to finalize', color: 'error' });
  }
}

// Checkout
const TIP_PRESETS = [15, 18, 20, 25] as const;
const selectedTipPreset = ref<number | null>(null);
const customTipDollars = ref<number | null>(null);
const showCustomTip = ref(false);
const charging = ref(false);
const paymentResult = ref<any>(null);

const hasCardOnFile = computed(
  () => !!appointment.value.paymentMethodId && !!appointment.value.stripeCustomerId,
);

const tipCents = computed(() => {
  if (showCustomTip.value && customTipDollars.value != null) {
    return Math.round(customTipDollars.value * 100);
  }
  if (selectedTipPreset.value != null && invoice.value) {
    return Math.round(invoice.value.totalCents * (selectedTipPreset.value / 100));
  }
  return 0;
});

const chargeTotal = computed(() => (invoice.value?.totalCents ?? 0) + tipCents.value);

function selectPreset(pct: number) {
  showCustomTip.value = false;
  customTipDollars.value = null;
  selectedTipPreset.value = selectedTipPreset.value === pct ? null : pct;
}

function selectCustom() {
  selectedTipPreset.value = null;
  showCustomTip.value = true;
}

async function chargeCard() {
  charging.value = true;
  try {
    const res = await $fetch<{ payment: any }>(`/api/admin/invoices/${invoice.value!.id}/charge`, {
      method: 'POST',
      body: { tipCents: tipCents.value },
    });
    paymentResult.value = res.payment;
    await refreshInvoice();
    toast.add({ title: 'Payment successful', color: 'success' });
  } catch (err: any) {
    toast.add({
      title: 'Payment failed',
      description: err?.data?.message ?? 'Card was declined or an error occurred.',
      color: 'error',
    });
  } finally {
    charging.value = false;
  }
}

async function recordCash() {
  charging.value = true;
  try {
    const res = await $fetch<{ payment: any }>(
      `/api/admin/invoices/${invoice.value!.id}/manual-payment`,
      { method: 'POST', body: { tipCents: tipCents.value } },
    );
    paymentResult.value = res.payment;
    await refreshInvoice();
    toast.add({ title: 'Payment recorded', color: 'success' });
  } catch {
    toast.add({ title: 'Failed to record payment', color: 'error' });
  } finally {
    charging.value = false;
  }
}
</script>

<template>
  <AppPage
    title="Appointment"
    back-to="/admin/appointments"
    width="wide">
    <template #info>
      <div class="flex items-center gap-3 text-sm">
        <AppCustomerLink :id="appointment.customerId">
          {{ appointment.customerName }}
        </AppCustomerLink>
        <AppStatusBadge
          kind="appointment"
          :value="appointment.status" />
        <span class="text-muted">
          {{ formatDate(headerDate) }}
        </span>
      </div>
    </template>

    <template #actions>
      <UButton
        v-if="nextAction(apptStatus)"
        :label="nextAction(apptStatus)!.label"
        :icon="nextAction(apptStatus)!.icon"
        :color="nextAction(apptStatus)!.color"
        :loading="updatingStatus"
        @click="updateStatus(nextAction(apptStatus)!.status)" />

      <UButton
        v-if="canMarkNoShow(apptStatus)"
        label="Mark No-show"
        icon="i-lucide-user-x"
        color="error"
        variant="outline"
        :loading="updatingStatus"
        @click="markNoShow" />

      <UButton
        v-if="canCancel(apptStatus)"
        label="Cancel"
        icon="i-lucide-x"
        color="error"
        variant="ghost"
        :loading="updatingStatus"
        @click="cancelAppointment" />
    </template>
    <AppCard
      v-for="pet in appointment.pets"
      :key="pet.id">
      <template #title>
        <AppPetLink
          v-if="pet.petId"
          :id="pet.petId">
          {{ pet.petName }}
        </AppPetLink>
        <span v-else>{{ pet.petName }}</span>
      </template>

      <div class="space-y-4 text-sm">
        <div class="flex flex-wrap gap-4 text-muted">
          <span>{{ formatDate(pet.scheduledDate) }}</span>
          <span>{{ formatTimeRange(pet.startTime, pet.endTime) }}</span>
          <span>{{ pet.estimatedDurationMinutes }} min</span>
        </div>

        <div v-if="pet.services?.length">
          <p class="font-medium mb-1">Services</p>
          <div
            v-for="svc in pet.services"
            :key="svc.id"
            class="flex justify-between py-1">
            <span>{{ svc.serviceName }}</span>
            <span>{{ formatCurrency(svc.priceAtBookingCents) }}</span>
          </div>
        </div>

        <div v-if="pet.addons?.length">
          <p class="font-medium mb-1">Addons</p>
          <div
            v-for="addon in pet.addons"
            :key="addon.id"
            class="flex justify-between py-1">
            <span>{{ addon.serviceName }}</span>
            <span>{{ formatCurrency(addon.priceAtBookingCents) }}</span>
          </div>
        </div>

        <div v-if="pet.bundles?.length">
          <p class="font-medium mb-1">Bundles</p>
          <div
            v-for="bundle in pet.bundles"
            :key="bundle.id"
            class="flex justify-between py-1 text-success">
            <span>{{ bundle.bundleName }}</span>
            <span>{{ formatCurrency(-bundle.discountAppliedCents) }}</span>
          </div>
        </div>

        <div class="flex justify-between pt-2 border-t font-medium">
          <span>Subtotal</span>
          <span>{{ formatCurrency(petSubtotal(pet)) }}</span>
        </div>
      </div>
    </AppCard>

    <AppCard v-if="!invoice">
      <div class="flex justify-between text-lg font-semibold">
        <span>Total</span>
        <span>{{ formatCurrency(grandTotal) }}</span>
      </div>
    </AppCard>

    <template v-if="INVOICE_STATUSES.includes(appointment.status)">
      <AppCard
        v-if="!invoice"
        title="Invoice">
        <UButton
          label="Generate Invoice"
          icon="i-lucide-file-text"
          :loading="generating"
          @click="genInvoice" />
      </AppCard>

      <AppCard
        v-else
        title="Invoice">
        <template #actions>
          <AppStatusBadge
            kind="invoice"
            :value="invoice.status" />
        </template>

        <div
          v-if="invoice.status === 'draft'"
          class="space-y-3">
          <div
            v-for="(item, index) in editableLineItems"
            :key="index"
            class="flex items-center gap-3">
            <UInput
              v-model="item.description"
              placeholder="Description"
              class="flex-1" />
            <UInputNumber
              v-model="item.amountCents"
              :step="100"
              class="w-32" />
            <USelect
              v-model="item.type"
              :items="LINE_ITEM_TYPE_ITEMS"
              class="w-36" />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              @click="removeLineItem(index)" />
          </div>

          <div class="flex gap-2 pt-2">
            <UButton
              label="Add Adjustment"
              icon="i-lucide-plus"
              variant="outline"
              size="sm"
              @click="addAdjustment" />
            <UButton
              label="Save Changes"
              icon="i-lucide-save"
              size="sm"
              :loading="saving"
              @click="saveLineItems" />
          </div>
        </div>

        <div
          v-else
          class="space-y-2">
          <div
            v-for="item in invoice.lineItems"
            :key="item.id"
            class="flex justify-between text-sm">
            <span>{{ item.description }}</span>
            <span :class="item.amountCents < 0 ? 'text-success' : ''">
              {{ formatCurrency(item.amountCents) }}
            </span>
          </div>
        </div>

        <hr class="border-default my-4" />
        <div class="space-y-1 text-sm">
          <div class="flex justify-between">
            <span>Subtotal</span>
            <span>{{ formatCurrency(invoice.subtotalCents) }}</span>
          </div>
          <div
            v-if="invoice.discountCents > 0"
            class="flex justify-between text-success">
            <span>Discounts</span>
            <span>{{ formatCurrency(-invoice.discountCents) }}</span>
          </div>
          <div
            v-if="(invoice.tipCents ?? 0) > 0"
            class="flex justify-between">
            <span>Tip</span>
            <span>{{ formatCurrency(invoice.tipCents) }}</span>
          </div>
          <div class="flex justify-between font-semibold text-base pt-1">
            <span>Total</span>
            <span>{{ formatCurrency(invoice.totalCents) }}</span>
          </div>
        </div>

        <div
          v-if="invoice.status === 'draft'"
          class="pt-4">
          <UButton
            label="Finalize Invoice"
            icon="i-lucide-lock"
            color="primary"
            @click="finalize" />
        </div>
      </AppCard>

      <AppCard
        v-if="invoice?.status === 'finalized' && !paymentResult"
        title="Checkout">
        <div class="mb-4">
          <p class="text-sm font-medium mb-2">Tip</p>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="pct in TIP_PRESETS"
              :key="pct"
              :label="`${pct}%`"
              :variant="selectedTipPreset === pct ? 'solid' : 'outline'"
              size="sm"
              @click="selectPreset(pct)" />
            <UButton
              label="Custom"
              :variant="showCustomTip ? 'solid' : 'outline'"
              size="sm"
              @click="selectCustom" />
          </div>

          <div
            v-if="showCustomTip"
            class="mt-3 flex items-center gap-2">
            <span class="text-sm">$</span>
            <UInputNumber
              v-model="customTipDollars"
              :min="0"
              :step="1"
              placeholder="0.00"
              class="w-32" />
          </div>

          <p
            v-if="tipCents > 0"
            class="text-sm text-muted mt-2">
            Tip: {{ formatCurrency(tipCents) }}
          </p>
        </div>

        <hr class="border-default my-4" />
        <div class="flex justify-between font-semibold text-lg mb-4">
          <span>Charge Total</span>
          <span>{{ formatCurrency(chargeTotal) }}</span>
        </div>

        <div v-if="hasCardOnFile">
          <UButton
            label="Charge Card"
            icon="i-lucide-credit-card"
            color="primary"
            size="lg"
            :loading="charging"
            @click="chargeCard" />
        </div>

        <div v-else>
          <p class="text-sm text-muted mb-3">No payment method on file.</p>
          <UButton
            label="Record Payment (Cash/Other)"
            icon="i-lucide-banknote"
            variant="outline"
            size="lg"
            :loading="charging"
            @click="recordCash" />
        </div>
      </AppCard>

      <AppCard
        v-if="invoice?.status === 'paid' || paymentResult"
        title="Payment">
        <div class="flex items-center gap-2 text-success mb-2">
          <UIcon name="i-lucide-check-circle" />
          <span class="font-semibold">Paid</span>
        </div>
        <div class="space-y-1 text-sm">
          <div class="flex justify-between">
            <span>Amount</span>
            <span>{{ formatCurrency(invoice?.totalCents ?? 0) }}</span>
          </div>
          <div
            v-if="(invoice?.tipCents ?? 0) > 0"
            class="flex justify-between">
            <span>Includes tip</span>
            <span>{{ formatCurrency(invoice?.tipCents ?? 0) }}</span>
          </div>
        </div>
      </AppCard>
    </template>

    <AppCard
      v-if="appointment.notes"
      title="Notes">
      <p class="text-sm text-muted">{{ appointment.notes }}</p>
    </AppCard>
  </AppPage>
</template>
