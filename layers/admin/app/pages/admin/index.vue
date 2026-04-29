<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'admin:access',
});

const { user } = useAuth();

const { data, status } = await useFetch('/api/admin/dashboard');

const loading = computed(() => status.value === 'pending');
const kpis = computed(() => data.value?.kpis);
const todaysAppointments = computed(() => data.value?.todaysAppointments ?? []);
const recentActivity = computed(() => data.value?.recentActivity ?? []);

const todayColumns = [
  { accessorKey: 'time', header: 'Time' },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'pets', header: 'Pets' },
  { accessorKey: 'status', header: 'Status' },
];

const todayDescription = computed(
  () => `Here's what's happening at the salon today, ${formatDate(new Date(), 'long')}.`,
);

function onAppointmentRowSelect(_e: Event, row: any) {
  navigateTo(`/admin/appointments/${row.original.id}`);
}
</script>

<template>
  <AppPage
    :title="`Welcome, ${user?.firstName}`"
    :description="todayDescription"
    width="wide">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <AppCard title="Today's Bookings">
        <USkeleton
          v-if="loading"
          class="h-9 w-16" />
        <div v-else>
          <div class="text-3xl font-semibold">{{ kpis?.todayBookings ?? 0 }}</div>
          <p class="text-xs text-muted mt-1">
            {{ kpis?.todayBookings === 1 ? 'appointment' : 'appointments' }} scheduled today
          </p>
        </div>
      </AppCard>

      <AppCard title="Pending Confirmations">
        <USkeleton
          v-if="loading"
          class="h-9 w-16" />

        <div v-else>
          <div class="text-3xl font-semibold">{{ kpis?.pendingConfirmations ?? 0 }}</div>
          <p class="text-xs text-muted mt-1">awaiting staff action</p>
        </div>
      </AppCard>

      <AppCard title="Revenue (last 7 days)">
        <USkeleton
          v-if="loading"
          class="h-9 w-24" />

        <div v-else>
          <div class="text-3xl font-semibold">
            {{ formatCurrency(kpis?.weekRevenueCents ?? 0) }}
          </div>

          <p class="text-xs text-muted mt-1">captured payments</p>
        </div>
      </AppCard>

      <AppCard title="No-shows (last 7 days)">
        <USkeleton
          v-if="loading"
          class="h-9 w-16" />
        <div v-else>
          <div class="text-3xl font-semibold">{{ kpis?.weekNoShows ?? 0 }}</div>
          <p class="text-xs text-muted mt-1">marked no-show this week</p>
        </div>
      </AppCard>
    </div>

    <AppTable
      card="default"
      title="Today's Appointments"
      :columns="todayColumns"
      :data="todaysAppointments"
      :loading="loading"
      :on-select="onAppointmentRowSelect"
      empty-icon="i-lucide-calendar"
      empty-title="No appointments today"
      empty-description="Nothing on the schedule for today.">
      <template #actions>
        <UButton
          label="View all"
          variant="ghost"
          trailing-icon="i-lucide-arrow-right"
          size="sm"
          @click="navigateTo('/admin/appointments')" />
      </template>

      <template #time-cell="{ row }: any">
        <span class="font-medium">{{ formatClockTime(row.original.pets[0]?.startTime) }}</span>
      </template>

      <template #customerName-cell="{ row }: any">
        <div class="flex items-center gap-2">
          <UAvatar
            :alt="row.original.customerName"
            size="md" />
          <div class="flex flex-col">
            <AppCustomerLink :id="row.original.customerId">
              {{ row.original.customerName }}
            </AppCustomerLink>
            <AppPhoneLink :phoneNumber="row.original.phone" />
          </div>
        </div>
      </template>

      <template #pets-cell="{ row }: any">
        <div class="flex">
          <template
            v-for="(pet, index) in row.original.pets"
            :key="pet.id">
            <AppPetLink :id="pet.petId">
              {{ pet.petName }}{{ index !== row.original.pets.length - 1 ? ', ' : '' }}
            </AppPetLink>
          </template>
        </div>
      </template>

      <template #status-cell="{ row }: any">
        <AppStatusBadge
          kind="appointment"
          :value="row.original.status" />
      </template>
    </AppTable>

    <AppCard title="Recent Activity">
      <div
        v-if="loading"
        class="space-y-3">
        <USkeleton
          v-for="n in 3"
          :key="n"
          class="h-12 w-full" />
      </div>

      <AppEmptyState
        v-else-if="recentActivity.length === 0"
        variant="section"
        icon="i-lucide-activity"
        title="No recent activity" />

      <ul
        v-else
        class="divide-y divide-default">
        <li
          v-for="appt in recentActivity"
          :key="appt.id"
          class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div class="flex items-center gap-3 min-w-0">
            <UIcon
              name="i-lucide-calendar-plus"
              class="size-4 text-muted shrink-0" />
            <div class="min-w-0">
              <p class="text-sm truncate">
                <AppAppointmentLink :id="appt.id">
                  {{ appt.customerName }}
                </AppAppointmentLink>
                booked
                {{ appt.pets.length === 1 ? '1 pet' : `${appt.pets.length} pets` }}
              </p>

              <p class="text-xs text-muted">
                {{ formatDate(appt.createdAt) }} · scheduled
                {{ formatDateTime(appt.pets[0]?.scheduledDate, appt.pets[0]?.startTime) }}
              </p>
            </div>
          </div>

          <AppStatusBadge
            kind="appointment"
            :value="appt.status" />
        </li>
      </ul>
    </AppCard>
  </AppPage>
</template>
