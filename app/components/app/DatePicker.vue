<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date';

defineProps<{
  disabled?: boolean;
}>();

const modelValue = defineModel<CalendarDate | undefined>();
const inputDate = useTemplateRef('inputDate');
</script>

<template>
  <UInputDate
    ref="inputDate"
    v-model="modelValue"
    :disabled="disabled">
    <template #trailing>
      <UPopover :reference="inputDate?.inputsRef[3]?.$el">
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
            class="p-2" />
        </template>
      </UPopover>
    </template>
  </UInputDate>
</template>
