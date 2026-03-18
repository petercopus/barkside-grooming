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

const state = reactive({
  date: props.initialValues?.date ?? '',
  isAvailable: props.initialValues?.isAvailable ?? false,
  startTime: props.initialValues?.startTime?.slice(0, 5) ?? '09:00',
  endTime: props.initialValues?.endTime?.slice(0, 5) ?? '17:00',
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
    <UFormField
      label="Date"
      name="date">
      <UInput
        v-model="state.date"
        type="date" />
    </UFormField>

    <UFormField
      label="Available"
      name="isAvailable">
      <USwitch v-model="state.isAvailable" />
    </UFormField>

    <template v-if="state.isAvailable">
      <UFormField
        label="Start Time"
        name="startTime">
        <UInput
          v-model="state.startTime"
          type="time" />
      </UFormField>

      <UFormField
        label="End Time"
        name="endTime">
        <UInput
          v-model="state.endTime"
          type="time" />
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
