<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date';

withDefaults(
  defineProps<{
    disabled?: boolean;
    minValue?: CalendarDate;
    maxValue?: CalendarDate;
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }>(),
  {
    size: 'md',
  },
);

const modelValue = defineModel<CalendarDate | undefined>();
const inputDate = useTemplateRef('inputDate');
const open = ref(false);

watch(modelValue, () => {
  open.value = false;
});
</script>

<template>
  <UInputDate
    ref="inputDate"
    v-model="modelValue"
    :disabled="disabled"
    :min-value="minValue"
    :max-value="maxValue"
    :size="size">
    <template #trailing>
      <UPopover
        v-model:open="open"
        :reference="inputDate?.inputsRef[3]?.$el">
        <UButton
          color="neutral"
          variant="link"
          size="sm"
          icon="i-lucide-calendar"
          aria-label="Select a date"
          class="px-0"
          :disabled="disabled" />

        <template #content>
          <UCalendar
            v-model="modelValue"
            :min-value="minValue"
            :max-value="maxValue"
            class="p-2" />
        </template>
      </UPopover>
    </template>
  </UInputDate>
</template>
