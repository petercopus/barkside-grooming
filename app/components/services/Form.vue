<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import type { ZodType } from 'zod';
import type { CreateServiceInput, UpdateServiceInput } from '~~/shared/schemas/service';

const props = defineProps<{
  schema: ZodType;
  initialValues?: Record<string, unknown>;
  loading?: boolean;
  submitLabel?: string;
}>();

const emit = defineEmits<{
  submit: [data: CreateServiceInput | UpdateServiceInput];
}>();

const state = reactive<Partial<CreateServiceInput>>({
  name: (props.initialValues?.name as string) ?? undefined,
  description: (props.initialValues?.description as string) ?? undefined,
  category: (props.initialValues?.category as string) ?? undefined,
  isAddon: (props.initialValues?.isAddon as boolean) ?? false,
  sortOrder: (props.initialValues?.sortOrder as number) ?? 0,
});

function onSubmit(event: FormSubmitEvent<unknown>) {
  emit('submit', event.data as CreateServiceInput | UpdateServiceInput);
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit">
    <!-- Name -->
    <UFormField
      label="Name"
      name="name"
      required>
      <UInput v-model="state.name" />
    </UFormField>

    <!-- Category -->
    <UFormField
      label="Category"
      name="category">
      <UInput v-model="state.category" />
    </UFormField>

    <!-- Addon Service -->
    <UFormField
      label="Addon Service"
      name="isAddon">
      <USwitch v-model="state.isAddon" />
    </UFormField>

    <!-- Sort Order -->
    <UFormField
      label="Sort Order"
      name="sortOrder">
      <UInputNumber
        v-model="state.sortOrder"
        :min="0" />
    </UFormField>

    <div class="flex justify-end gap-3 pt-2">
      <UButton
        to="/employee/services"
        variant="outline">
        Cancel
      </UButton>
      <UButton
        type="submit"
        :loading="loading">
        {{ submitLabel ?? 'Save' }}
      </UButton>
    </div>
  </UForm>
</template>
