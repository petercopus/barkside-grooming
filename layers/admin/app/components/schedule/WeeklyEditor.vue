<script setup lang="ts">
import type { Time } from '@internationalized/date';

const props = defineProps<{
  entries: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  save: [
    entries: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }[],
  ];
}>();

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const days = reactive(
  dayNames.map((_, i) => {
    const existing = props.entries.find((e) => e.dayOfWeek === i);
    return {
      dayOfWeek: i,
      isAvailable: existing?.isAvailable ?? false,
      startTime: shallowRef<Time | undefined>(parseTime(existing?.startTime) ?? parseTime('09:00')),
      endTime: shallowRef<Time | undefined>(parseTime(existing?.endTime) ?? parseTime('17:00')),
    };
  }),
);

function onSave() {
  const entries = days
    .filter((d) => d.isAvailable)
    .map((d) => ({
      dayOfWeek: d.dayOfWeek,
      startTime: formatTime(d.startTime) ?? '09:00',
      endTime: formatTime(d.endTime) ?? '17:00',
      isAvailable: true,
    }));

  emit('save', entries);
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="day in days"
      :key="day.dayOfWeek"
      class="flex items-center gap-4 p-3 border border-default rounded-lg">
      <div class="w-28 font-medium text-sm">
        {{ dayNames[day.dayOfWeek] }}
      </div>

      <USwitch v-model="day.isAvailable" />

      <template v-if="day.isAvailable">
        <UInputTime
          v-model="day.startTime"
          :hour-cycle="24" />
        <span class="text-sm text-muted">to</span>
        <UInputTime
          v-model="day.endTime"
          :hour-cycle="24" />
      </template>

      <span
        v-else
        class="text-sm text-muted">
        Day off
      </span>
    </div>

    <div class="flex justify-end pt-2">
      <UButton
        :loading="loading"
        label="Save"
        @click="onSave" />
    </div>
  </div>
</template>
