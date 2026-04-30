<script setup lang="ts">
definePageMeta({
  layout: 'site',
  middleware: 'auth',
});

const route = useRoute();
const id = route.params.id as string;

const { data, refresh } = await useFetch<{ appointment: any }>(`/api/appointments/${id}`);

if (!data.value?.appointment) {
  throw createError({ statusCode: 404, message: 'Appointment not found' });
}

const appointment = computed(() => data.value!.appointment);

const { data: invoiceData } = await useFetch<{ invoice: any }>(`/api/appointments/${id}/invoice`);
const invoice = computed(() => invoiceData.value?.invoice ?? null);

const refundCents = computed(() => {
  const refunds = (invoice.value?.payments ?? []).filter((p: any) => p.status === 'refunded');
  return refunds.reduce((sum: number, p: any) => sum + Math.abs(p.amountCents), 0);
});

const headerDate = computed(() => {
  const dates = (appointment.value.pets ?? [])
    .map((p: any) => p.scheduledDate)
    .filter(Boolean)
    .sort();
  return dates[0] ?? appointment.value.createdAt;
});

const confirm = useConfirmDialog();

async function cancelAppointment() {
  const ok = await confirm({
    title: 'Cancel appointment',
    description: 'Are you sure you want to cancel this appointment?',
    confirmLabel: `I'm sure`,
    confirmColor: 'error',
  });
  if (!ok) return;

  await $fetch(`/api/appointments/${id}/cancel`, { method: 'PATCH' });
  await refresh();
}

const canCancel = computed(() =>
  ['pending', 'pending_documents', 'confirmed'].includes(appointment.value.status),
);

function petSubtotal(pet: any): number {
  const services =
    pet.services?.reduce((sum: number, s: any) => sum + s.priceAtBookingCents, 0) ?? 0;
  const addons = pet.addons?.reduce((sum: number, a: any) => sum + a.priceAtBookingCents, 0) ?? 0;
  const discount =
    pet.bundles?.reduce((sum: number, b: any) => sum + b.discountAppliedCents, 0) ?? 0;

  return services + addons - discount;
}
</script>

<template>
  <div class="cms-container py-10 sm:py-14 max-w-4xl">
    <AppPageIntro
      kicker="Appointment"
      :title="formatDate(headerDate, 'long')"
      back-to="/me/appointments">
      <template #actions>
        <UBadge
          :color="apptStatusColor[appointment.status] ?? 'neutral'"
          variant="subtle"
          size="lg"
          :label="apptStatusLabel[appointment.status] ?? appointment.status" />

        <UButton
          v-if="canCancel"
          variant="ghost"
          color="error"
          icon="i-lucide-x"
          label="Cancel"
          @click="cancelAppointment" />
      </template>
    </AppPageIntro>

    <div class="mt-8 space-y-6">
      <!-- Pets -->
      <AppSectionPanel
        kicker="Visit"
        title="Pets & services"
        icon="i-lucide-paw-print">
        <div class="space-y-5">
          <div
            v-for="(pet, petIdx) in appointment.pets"
            :key="pet.id"
            :class="Number(petIdx) > 0 ? 'pt-5 border-t border-default/50' : ''">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-display-soft text-xl text-barkside-900 leading-tight">
                  {{ pet.petName }}
                </p>

                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted">
                  <span class="inline-flex items-center gap-1">
                    <UIcon
                      name="i-lucide-clock"
                      class="size-3.5 text-primary-500" />
                    {{ formatClockTime(pet.startTime) }} — {{ formatClockTime(pet.endTime) }}
                  </span>

                  <span
                    v-if="pet.assignedGroomerName"
                    class="inline-flex items-center gap-1">
                    <UIcon
                      name="i-lucide-user"
                      class="size-3.5 text-primary-500" />
                    with {{ pet.assignedGroomerName }}
                  </span>
                </div>
              </div>

              <span class="text-sm font-semibold text-default tabular-nums shrink-0">
                {{ formatCurrency(petSubtotal(pet)) }}
              </span>
            </div>

            <ul
              v-if="pet.services?.length || pet.addons?.length || pet.bundles?.length"
              class="mt-3 space-y-1 text-sm">
              <li
                v-for="service in pet.services"
                :key="`s-${service.id}`"
                class="flex justify-between gap-3">
                <span class="text-default truncate">{{ service.serviceName }}</span>
                <span class="text-muted tabular-nums shrink-0">
                  {{ formatCurrency(service.priceAtBookingCents) }}
                </span>
              </li>

              <li
                v-for="addon in pet.addons"
                :key="`a-${addon.id}`"
                class="flex justify-between gap-3 text-muted">
                <span class="truncate">+ {{ addon.serviceName }}</span>
                <span class="tabular-nums shrink-0">
                  {{ formatCurrency(addon.priceAtBookingCents) }}
                </span>
              </li>

              <li
                v-for="bundle in pet.bundles"
                :key="`b-${bundle.id}`"
                class="flex justify-between gap-3 text-success">
                <span class="truncate">{{ bundle.bundleName }} discount</span>
                <span class="tabular-nums shrink-0">
                  -{{ formatCurrency(bundle.discountAppliedCents) }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </AppSectionPanel>

      <!-- Invoice -->
      <AppSectionPanel
        v-if="invoice"
        kicker="Invoice"
        title="Charges"
        icon="i-lucide-receipt">
        <template #actions>
          <UBadge
            :color="invoiceStatusColor[invoice.status] ?? 'neutral'"
            variant="subtle"
            :label="invoiceStatusLabel[invoice.status] ?? invoice.status" />
        </template>

        <div class="space-y-2">
          <div
            v-for="item in invoice.lineItems"
            :key="item.id"
            class="flex justify-between text-sm">
            <span class="text-default truncate">{{ item.description }}</span>
            <span
              class="tabular-nums shrink-0"
              :class="item.amountCents < 0 ? 'text-success' : 'text-muted'">
              {{ formatCurrency(item.amountCents) }}
            </span>
          </div>
        </div>

        <hr class="border-default my-4" />

        <div class="space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-muted">Subtotal</span>
            <span class="tabular-nums">{{ formatCurrency(invoice.subtotalCents) }}</span>
          </div>

          <div
            v-if="invoice.discountCents > 0"
            class="flex justify-between text-success">
            <span>Discounts</span>
            <span class="tabular-nums">{{ formatCurrency(-invoice.discountCents) }}</span>
          </div>

          <div
            v-if="(invoice.tipCents ?? 0) > 0"
            class="flex justify-between">
            <span class="text-muted">Tip</span>
            <span class="tabular-nums">{{ formatCurrency(invoice.tipCents) }}</span>
          </div>

          <div class="flex justify-between font-semibold text-base pt-1">
            <span>Total</span>
            <span class="tabular-nums">{{ formatCurrency(invoice.totalCents) }}</span>
          </div>

          <div
            v-if="refundCents > 0"
            class="flex justify-between text-success pt-1">
            <span>Refunded</span>
            <span class="tabular-nums">-{{ formatCurrency(refundCents) }}</span>
          </div>
        </div>

        <p
          v-if="invoice.status === 'paid' && invoice.paidAt"
          class="text-xs text-muted mt-4">
          Paid on {{ formatTimestamp(invoice.paidAt) }}
        </p>
      </AppSectionPanel>
    </div>
  </div>
</template>
