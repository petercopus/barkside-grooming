<script setup lang="ts">
type TimeSlot = { startTime: string; endTime: string };
type GroomerSlot = { groomerId: string; groomerName: string; slots: TimeSlot[] };

const props = defineProps<{
  groomers: GroomerSlot[];
  selectedGroomerId?: string | null;
  selectedStartTime?: string | null;
  durationMinutes?: number;
}>();

const emit = defineEmits<{ select: [groomerId: string, startTime: string] }>();

type Bucket = { key: 'morning' | 'afternoon' | 'evening'; label: string; slots: TimeSlot[] };

function bucketSlots(slots: TimeSlot[]): Bucket[] {
  const morning: TimeSlot[] = [];
  const afternoon: TimeSlot[] = [];
  const evening: TimeSlot[] = [];
  for (const s of slots) {
    const hour = Number(s.startTime.split(':')[0]);
    if (hour < 12) morning.push(s);
    else if (hour < 17) afternoon.push(s);
    else evening.push(s);
  }
  return [
    { key: 'morning', label: 'Morning', slots: morning },
    { key: 'afternoon', label: 'Afternoon', slots: afternoon },
    { key: 'evening', label: 'Evening', slots: evening },
  ].filter((b) => b.slots.length > 0) as Bucket[];
}

const AVATAR_PALETTE = [
  'bg-primary-100 text-primary-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
];

function avatarFor(name: string) {
  const initial = (name?.trim()?.[0] ?? 'G').toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const palette = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  return { initial, palette };
}

function isSelected(groomerId: string, startTime: string) {
  return props.selectedGroomerId === groomerId && props.selectedStartTime === startTime;
}
</script>

<template>
  <div
    v-if="groomers.length === 0"
    class="rounded-xl border border-dashed border-default/70 bg-white/40 px-4 py-8 text-center">
    <UIcon
      name="i-lucide-calendar-x"
      class="size-6 text-muted mx-auto mb-2" />

    <p class="text-sm text-muted">No available slots for this date. Try another day.</p>
  </div>

  <div
    v-else
    class="space-y-4">
    <div
      v-for="groomer in groomers"
      :key="groomer.groomerId"
      class="rounded-2xl border border-default/70 bg-white/70 p-5 shadow-sm">
      <header class="flex items-center gap-3 mb-4">
        <span
          :class="[
            'inline-flex size-10 items-center justify-center rounded-full font-semibold shrink-0',
            avatarFor(groomer.groomerName).palette,
          ]">
          {{ avatarFor(groomer.groomerName).initial }}
        </span>

        <div class="min-w-0 flex-1">
          <p class="font-semibold text-default leading-tight">
            {{ groomer.groomerName || 'Groomer' }}
          </p>

          <p class="text-xs text-muted mt-0.5">
            {{ groomer.slots.length }} {{ groomer.slots.length === 1 ? 'opening' : 'openings' }}
            <template v-if="durationMinutes">· {{ durationMinutes }} min appointment</template>
          </p>
        </div>
      </header>

      <div class="space-y-3">
        <div
          v-for="bucket in bucketSlots(groomer.slots)"
          :key="bucket.key">
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted mb-1.5">
            {{ bucket.label }}
          </p>

          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="slot in bucket.slots"
              :key="slot.startTime"
              type="button"
              :class="[
                'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                isSelected(groomer.groomerId, slot.startTime)
                  ? 'border-primary-500 bg-primary-500 text-white shadow ring-2 ring-primary-500/30'
                  : 'border-default bg-white text-default hover:border-primary-400 hover:bg-primary-50/60',
              ]"
              @click="emit('select', groomer.groomerId, slot.startTime)">
              <UIcon
                v-if="isSelected(groomer.groomerId, slot.startTime)"
                name="i-lucide-check"
                class="size-3.5" />
              {{ formatClockTime(slot.startTime) }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
