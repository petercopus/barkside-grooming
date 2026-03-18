<script setup lang="ts">
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
      startTime: existing?.startTime?.slice(0, 5) ?? '09:00',
      endTime: existing?.endTime?.slice(0, 5) ?? '17:00',
    };
  }),
);

function onSave() {
  const entries = days
    .filter((d) => d.isAvailable)
    .map((d) => ({
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime,
      endTime: d.endTime,
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
      class="flex items-center gap-4 p-3 border rounded-lg">
      <div class="w-28 font-medium text-sm">
        {{ dayNames[day.dayOfWeek] }}
      </div>

      <USwitch v-model="day.isAvailable" />

      <template v-if="day.isAvailable">
        <UInput
          v-model="day.startTime"
          type="time"
          class="w-32" />
        <span class="text-sm text-muted">to</span>
        <UInput
          v-model="day.endTime"
          type="time"
          class="w-32" />
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
