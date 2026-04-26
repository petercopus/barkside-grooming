<script setup lang="ts">
definePageMeta({
  layout: 'site',
  middleware: 'auth',
});

const { data, refresh } = await useFetch('/api/appointments');
const confirm = useConfirmDialog();

async function cancelAppointment(id: string) {
  const confirmed = await confirm({
    title: 'Cancel appointment',
    description: 'Are you sure you want to cancel this appointment?',
    confirmLabel: `I'm sure`,
  });

  if (!confirmed) return;

  await $fetch(`/api/appointments/${id}/cancel`, { method: 'PATCH' });
  await refresh();
}
</script>

<template>
  <div class="cms-container py-6 sm:py-10">
    <AppPageHeader
      title="My Appointments"
      description="View and manage your appointments">
      <template #actions>
        <UButton
          to="/book"
          icon="i-lucide-plus">
          Book Appointment
        </UButton>
      </template>
    </AppPageHeader>

    <div class="py-4">
      <AppEmptyState
        v-if="!data?.appointments?.length"
        icon="i-lucide-calendar"
        title="No appointments"
        description="Book your first appointment to get started."
        action-label="Book Appointment"
        action-icon="i-lucide-plus"
        variant="section"
        @action="navigateTo('/book')" />

      <div
        v-else
        class="space-y-4">
        <AppCard
          v-for="appt in data.appointments"
          :key="appt.id"
          :title="appt.pets.map((p) => p.petName).join(', ')">
          <template #actions>
            <UBadge
              :color="
                appt.status === 'cancelled'
                  ? 'error'
                  : appt.status === 'completed'
                    ? 'success'
                    : 'primary'
              "
              variant="subtle"
              :label="appt.status" />

            <UButton
              v-if="['pending', 'pending_documents', 'confirmed'].includes(appt.status)"
              variant="ghost"
              size="sm"
              color="error"
              icon="i-lucide-x"
              @click="cancelAppointment(appt.id)" />
          </template>

          <div
            v-for="pet in appt.pets"
            :key="pet.id"
            class="mb-2">
            <p class="text-sm font-medium">{{ pet.petName }}</p>
            <dl class="text-sm space-y-1">
              <div class="flex gap-2">
                <dt class="text-muted">Date:</dt>
                <dd>{{ pet.scheduledDate }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="text-muted">Time:</dt>
                <dd>{{ pet.startTime }}—{{ pet.endTime }}</dd>
              </div>
              <div
                v-for="service in pet.services"
                :key="service.id"
                class="flex gap-2">
                <dt class="text-muted">Service:</dt>
                <dd>{{ service.serviceName }} — ${{ formatCents(service.priceAtBookingCents) }}</dd>
              </div>
            </dl>
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>
