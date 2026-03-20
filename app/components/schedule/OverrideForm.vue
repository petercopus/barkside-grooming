<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { createOverrideSchema, type CreateOverrideInput } from '~~/shared/schemas/schedule';

const props = defineProps<{
  initialValues?: {
    date?: string;
    startTime?: string | null;
    endTime?: string | null;
    isAvailable?: boolean;
    reason?: string | null;
  };
  loading?: boolean;
}>();

const emit = defineEmits<{
  submit: [data: CreateOverrideInput];
  cancel: [];
}>();

const dateCalendar = shallowRef(parseCalendarDate(props.initialValues?.date));
const startTimeValue = shallowRef(parseTime(props.initialValues?.startTime) ?? parseTime('09:00'));
const endTimeValue = shallowRef(parseTime(props.initialValues?.endTime) ?? parseTime('17:00'));

const state = reactive({
  date: computed(() => formatCalendarDate(dateCalendar.value) ?? ''),
  isAvailable: props.initialValues?.isAvailable ?? false,
  startTime: computed(() => formatTime(startTimeValue.value) ?? '09:00'),
  endTime: computed(() => formatTime(endTimeValue.value) ?? '17:00'),
  reason: props.initialValues?.reason ?? '',
});

function onSubmit(event: FormSubmitEvent<unknown>) {
  emit('submit', event.data as CreateOverrideInput);
}
</script>

<template>
  <UForm
    :schema="createOverrideSchema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit">
    <!-- Date input -->
    <UFormField
      label="Date"
      name="date">
      <AppDatePicker v-model="dateCalendar" />
    </UFormField>

    <!-- Available switch -->
    <UFormField
      label="Available"
      name="isAvailable">
      <USwitch v-model="state.isAvailable" />
    </UFormField>

    <template v-if="state.isAvailable">
      <UFormField
        label="Start Time"
        name="startTime">
        <UInputTime
          v-model="startTimeValue"
          :hour-cycle="24" />
      </UFormField>

      <UFormField
        label="End Time"
        name="endTime">
        <UInputTime
          v-model="endTimeValue"
          :hour-cycle="24" />
      </UFormField>
    </template>

    <UFormField
      label="Reason"
      name="reason">
      <UInput v-model="state.reason" />
    </UFormField>

    <div class="flex gap-2">
      <UButton
        variant="ghost"
        label="Cancel"
        @click="emit('cancel')" />
      <UButton
        type="submit"
        :loading="loading"
        :label="initialValues ? 'Update' : 'Add'" />
    </div>
  </UForm>
</template>
