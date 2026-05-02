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

const today = todayDateString();

const grouped = computed(() => {
  const all = data.value?.appointments ?? [];
  const upcoming: typeof all = [];
  const past: typeof all = [];

  for (const appt of all) {
    const earliest = appt.pets
      .map((p) => p.scheduledDate)
      .filter(Boolean)
      .sort()[0] as string | undefined;

    const isPast =
      appt.status === 'completed' ||
      appt.status === 'cancelled' ||
      appt.status === 'no_show' ||
      (earliest && earliest < today);

    if (isPast) past.push(appt);
    else upcoming.push(appt);
  }

  // Sort upcoming by earliest pet date asc, past by earliest desc
  const earliestOf = (a: any) =>
    a.pets
      .map((p: any) => p.scheduledDate)
      .filter(Boolean)
      .sort()[0] ?? '';

  upcoming.sort((a, b) => earliestOf(a).localeCompare(earliestOf(b)));
  past.sort((a, b) => earliestOf(b).localeCompare(earliestOf(a)));

  return { upcoming, past };
});

function petTotalCents(pet: any) {
  const base = (pet.services ?? []).reduce(
    (sum: number, s: any) => sum + (s.priceAtBookingCents ?? 0),
    0,
  );

  const addons = (pet.addons ?? []).reduce(
    (sum: number, a: any) => sum + (a.priceAtBookingCents ?? 0),
    0,
  );

  const discounts = (pet.bundles ?? []).reduce(
    (sum: number, b: any) => sum + (b.discountAppliedCents ?? 0),
    0,
  );

  return Math.max(0, base + addons - discounts);
}

function appointmentTotalCents(appt: any) {
  return appt.pets.reduce((sum: number, p: any) => sum + petTotalCents(p), 0);
}

function dateMonth(date: string) {
  if (!date) return '';

  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}
function dateDay(date: string) {
  if (!date) return '';

  const d = new Date(date + 'T00:00:00');
  return d.getDate();
}
function dateWeekday(date: string) {
  if (!date) return '';

  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}
</script>

<template>
  <div class="cms-container py-10 sm:py-14">
    <AppPageIntro
      kicker="Your account"
      title="My appointments"
      description="Upcoming visits, past grooms, and everything in between.">
      <template #actions>
        <UButton
          to="/book"
          icon="i-lucide-plus"
          size="lg">
          Book a visit
        </UButton>
      </template>
    </AppPageIntro>

    <div class="mt-10 space-y-10">
      <AppEmptyState
        v-if="!data?.appointments?.length"
        icon="i-lucide-calendar-heart"
        title="No appointments yet"
        description="Book your first groom and we'll have a treat waiting."
        action-label="Book a visit"
        action-icon="i-lucide-plus"
        @action="navigateTo('/book')" />

      <template v-else>
        <!-- Upcoming -->
        <section v-if="grouped.upcoming.length">
          <div class="flex items-end justify-between mb-4">
            <div>
              <p class="kicker">Upcoming</p>

              <h2 class="font-display-soft text-3xl text-barkside-900 leading-tight mt-1">
                Coming up
              </h2>
            </div>

            <p class="text-sm text-muted">
              {{ grouped.upcoming.length }}
              {{ grouped.upcoming.length === 1 ? 'visit' : 'visits' }}
            </p>
          </div>

          <div class="space-y-4">
            <article
              v-for="(appt, idx) in grouped.upcoming"
              :key="appt.id"
              :style="{ animationDelay: `${Math.min(idx * 60, 360)}ms` }"
              class="reveal-subtle rounded-2xl border border-default/70 bg-white/70 shadow-sm overflow-hidden">
              <header
                class="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-b border-default/60 bg-bone-100/50">
                <div class="flex items-center gap-2.5 min-w-0">
                  <UIcon
                    name="i-lucide-paw-print"
                    class="size-4 text-primary-500 shrink-0" />

                  <p class="text-sm font-semibold text-default truncate">
                    {{ appt.pets.map((p) => p.petName).join(', ') }}
                  </p>
                </div>

                <UBadge
                  :color="apptStatusColor[appt.status] ?? 'neutral'"
                  variant="subtle"
                  :label="apptStatusLabel[appt.status] ?? appt.status" />
              </header>

              <div class="px-5 sm:px-6 py-5 space-y-5">
                <div
                  v-for="(pet, petIdx) in appt.pets"
                  :key="pet.id"
                  class="flex items-start gap-4"
                  :class="petIdx > 0 ? 'pt-5 border-t border-default/50' : ''">
                  <!-- Date block -->
                  <div
                    class="flex flex-col items-center justify-center rounded-xl bg-primary-50/50 border border-primary-100/70 size-16 shrink-0">
                    <span
                      class="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-600">
                      {{ dateMonth(pet.scheduledDate) }}
                    </span>

                    <span class="font-display-soft text-2xl text-barkside-900 leading-none">
                      {{ dateDay(pet.scheduledDate) }}
                    </span>

                    <span class="text-[10px] text-muted">{{ dateWeekday(pet.scheduledDate) }}</span>
                  </div>

                  <div class="min-w-0 flex-1">
                    <p class="font-display-soft text-xl text-barkside-900 leading-tight">
                      {{ pet.petName }}
                    </p>

                    <div
                      class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted">
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

                    <ul
                      v-if="pet.services?.length"
                      class="mt-3 space-y-1 text-sm">
                      <li
                        v-for="service in pet.services"
                        :key="service.id"
                        class="flex justify-between gap-3">
                        <span class="text-default truncate">{{ service.serviceName }}</span>
                        <span class="text-muted tabular-nums shrink-0">
                          ${{ formatCents(service.priceAtBookingCents) }}
                        </span>
                      </li>

                      <li
                        v-for="addon in pet.addons"
                        :key="addon.id"
                        class="flex justify-between gap-3 text-muted">
                        <span class="truncate">+ {{ addon.serviceName }}</span>
                        <span class="tabular-nums shrink-0">
                          ${{ formatCents(addon.priceAtBookingCents) }}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <footer
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-4 border-t border-default/60 bg-bone-100/30">
                <div class="flex items-center gap-2 text-sm">
                  <UIcon
                    name="i-lucide-receipt"
                    class="size-4 text-primary-500" />

                  <span class="text-muted">Total</span>
                  <span class="font-semibold text-default tabular-nums">
                    ${{ formatCents(appointmentTotalCents(appt)) }}
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <UButton
                    :to="`/me/appointments/${appt.id}`"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-arrow-right"
                    trailing
                    label="View details" />

                  <UButton
                    v-if="['pending', 'pending_documents', 'confirmed'].includes(appt.status)"
                    variant="ghost"
                    color="error"
                    size="sm"
                    icon="i-lucide-x"
                    label="Cancel"
                    @click="cancelAppointment(appt.id)" />
                </div>
              </footer>
            </article>
          </div>
        </section>

        <!-- Past -->
        <section v-if="grouped.past.length">
          <div class="flex items-end justify-between mb-4">
            <div>
              <p class="kicker">History</p>

              <h2 class="font-display-soft text-3xl text-barkside-900 leading-tight mt-1">
                Past visits
              </h2>
            </div>

            <p class="text-sm text-muted">
              {{ grouped.past.length }}
              {{ grouped.past.length === 1 ? 'visit' : 'visits' }}
            </p>
          </div>

          <div class="space-y-3">
            <NuxtLink
              v-for="appt in grouped.past"
              :key="appt.id"
              :to="`/me/appointments/${appt.id}`"
              class="block rounded-2xl border border-default/60 bg-white/40 px-5 py-4 transition hover:bg-white/70 hover:border-primary/40">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <span
                    class="inline-flex size-9 items-center justify-center rounded-xl bg-bone-200/60 text-bone-700 shrink-0">
                    <UIcon
                      name="i-lucide-paw-print"
                      class="size-4" />
                  </span>

                  <div class="min-w-0">
                    <p class="font-medium text-default truncate">
                      {{ appt.pets.map((p) => p.petName).join(', ') }}
                    </p>

                    <p class="text-sm text-muted">
                      {{ formatDate(appt.pets[0]?.scheduledDate, 'long') }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  <span class="text-sm text-muted tabular-nums">
                    ${{ formatCents(appointmentTotalCents(appt)) }}
                  </span>

                  <UBadge
                    :color="apptStatusColor[appt.status] ?? 'neutral'"
                    variant="subtle"
                    size="sm"
                    :label="apptStatusLabel[appt.status] ?? appt.status" />
                </div>
              </div>
            </NuxtLink>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
