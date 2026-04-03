<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'booking:read:all',
});

const route = useRoute();
const id = route.params.id as string;

const { data } = await useFetch(`/api/admin/appointments/${id}`);

if (!data.value?.appointment) {
  throw createError({ statusCode: 404, message: 'Appointment not found' });
}

const appointment = data.value.appointment;

function petSubtotal(pet: any): number {
  const services =
    pet.services?.reduce((sum: number, s: any) => sum + s.priceAtBookingCents, 0) ?? 0;
  const addons = pet.addons?.reduce((sum: number, a: any) => sum + a.priceAtBookingCents, 0) ?? 0;
  const discount =
    pet.bundles?.reduce((sum: number, b: any) => sum + b.discountAppliedCents, 0) ?? 0;

  return services + addons - discount;
}

const grandTotal = computed(() =>
  (appointment.pets ?? []).reduce((sum: number, pet: any) => sum + petSubtotal(pet), 0),
);
</script>

<template>
  <div>
    <AppPageHeader
      title="Appointment"
      back-to="/admin/appointments">
      <template #info>
        <div class="flex items-center gap-3 text-sm">
          <NuxtLink
            :to="`/admin/customers/${appointment.customerId}`"
            class="text-primary hover:underline">
            {{ appointment.customerName }}
          </NuxtLink>
          <UBadge
            :color="apptStatusColor[appointment.status] ?? 'neutral'"
            variant="subtle">
            {{ appointment.status }}
          </UBadge>
          <span class="text-muted">
            {{ new Date(appointment.createdAt).toLocaleDateString() }}
          </span>
        </div>
      </template>
    </AppPageHeader>

    <div class="py-4 space-y-6">
      <!-- per pet breakdown -->
      <AppCard
        v-for="pet in appointment.pets"
        :key="pet.id">
        <template #title>
          <NuxtLink
            :to="`/admin/pets/${pet.petId}`"
            class="text-primary hover:underline">
            {{ pet.petName }}
          </NuxtLink>
        </template>

        <div class="space-y-4 text-sm">
          <!-- schedule -->
          <div class="flex flex-wrap gap-4 text-muted">
            <span>{{ pet.scheduledDate }}</span>
            <span>{{ pet.startTime }} — {{ pet.endTime }}</span>
            <span>{{ pet.estimatedDurationMinutes }} min</span>
          </div>

          <!-- services -->
          <div v-if="pet.services?.length">
            <p class="font-medium mb-1">Services</p>
            <div
              v-for="svc in pet.services"
              :key="svc.id"
              class="flex justify-between py-1">
              <span>{{ svc.serviceName }}</span>
              <span>${{ formatCents(svc.priceAtBookingCents) }}</span>
            </div>
          </div>

          <!-- addons -->
          <div v-if="pet.addons?.length">
            <p class="font-medium mb-1">Addons</p>
            <div
              v-for="addon in pet.addons"
              :key="addon.id"
              class="flex justify-between py-1">
              <span>{{ addon.serviceName }}</span>
              <span>${{ formatCents(addon.priceAtBookingCents) }}</span>
            </div>
          </div>

          <!-- bundles -->
          <div v-if="pet.bundles?.length">
            <p class="font-medium mb-1">Bundles</p>
            <div
              v-for="bundle in pet.bundles"
              :key="bundle.id"
              class="flex justify-between py-1 text-success">
              <span>{{ bundle.bundleName }}</span>
              <span>-${{ formatCents(bundle.discountAppliedCents) }}</span>
            </div>
          </div>

          <!-- subtotal -->
          <div class="flex justify-between pt-2 border-t font-medium">
            <span>Subtotal</span>
            <span>${{ formatCents(petSubtotal(pet)) }}</span>
          </div>
        </div>
      </AppCard>

      <!-- Grand total -->
      <AppCard>
        <div class="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>${{ formatCents(grandTotal) }}</span>
        </div>
      </AppCard>

      <!-- Notes -->
      <AppCard
        v-if="appointment.notes"
        title="Notes">
        <p class="text-sm text-muted">{{ appointment.notes }}</p>
      </AppCard>
    </div>
  </div>
</template>
