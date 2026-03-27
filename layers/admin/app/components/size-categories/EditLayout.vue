<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import {
  createSizeCategorySchema,
  updateSizeCategorySchema,
  type CreateSizeCategoryInput,
} from '~~/shared/schemas/size-category';

const props = defineProps<{
  mode: 'create' | 'edit';
  initialValues?: Record<string, unknown>;
  categoryId?: number;
}>();

const isCreate = computed(() => props.mode === 'create');
const schema = computed(() =>
  isCreate.value ? createSizeCategorySchema : updateSizeCategorySchema,
);

/* ─────────────────────────────────── *
 *  Form State
 * ─────────────────────────────────── */
const state = reactive({
  name: (props.initialValues?.name as string) ?? undefined,
  minWeight: (props.initialValues?.minWeight as number) ?? undefined,
  maxWeight: (props.initialValues?.maxWeight as number) ?? undefined,
});

/* ─────────────────────────────────── *
 *  Create Mode
 * ─────────────────────────────────── */
const create = isCreate.value
  ? useFormAction({
      redirectTo: (res: any) => `/admin/settings/size-categories/${res.category.id}/edit`,
    })
  : null;

/* ─────────────────────────────────── *
 *  Edit Mode
 * ─────────────────────────────────── */
const pageSave = !isCreate.value
  ? usePageSave({
      sections: {
        details: {
          track: () => ({
            name: state.name,
            minWeight: state.minWeight,
            maxWeight: state.maxWeight,
          }),
          save: (data) =>
            $fetch(`/api/admin/size-categories/${props.categoryId}`, {
              method: 'PATCH',
              body: data,
            }),
        },
      },
      successMessage: 'Size category updated',
    })
  : null;

const { discardChanges } = useDiscardable(state, pageSave);

/* ─────────────────────────────────── *
 *  Submit
 * ─────────────────────────────────── */
const loading = computed(() => (isCreate.value ? create!.loading.value : pageSave!.loading.value));
const error = computed(() => (isCreate.value ? create!.error.value : pageSave!.error.value));

function onSubmit(event: FormSubmitEvent<unknown>) {
  if (isCreate.value) {
    create!.execute(() =>
      $fetch('/api/admin/size-categories', {
        method: 'POST',
        body: event.data as CreateSizeCategoryInput,
      }),
    );
  } else {
    pageSave!.submit();
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    @submit="onSubmit">
    <div class="max-w-xl space-y-6">
      <AppSection :error="error">
        <div class="space-y-4">
          <!-- Name -->
          <UFormField
            label="Name"
            name="name"
            required>
            <UInput v-model="state.name" />
          </UFormField>

          <!-- Min Weight -->
          <UFormField
            label="Min Weight (lbs)"
            name="minWeight"
            required>
            <UInputNumber
              v-model="state.minWeight"
              :min="0" />
          </UFormField>

          <!-- Max Weight -->
          <UFormField
            label="Max Weight (lbs)"
            name="maxWeight"
            required>
            <UInputNumber
              v-model="state.maxWeight"
              :min="1" />
          </UFormField>
        </div>
      </AppSection>
    </div>

    <div class="flex justify-end gap-2 mt-6">
      <UButton
        v-if="isCreate"
        to="/admin/settings/size-categories"
        variant="ghost"
        label="Cancel" />
      <UButton
        v-else-if="pageSave?.isDirty.value"
        variant="ghost"
        label="Discard"
        @click="discardChanges" />
      <UButton
        type="submit"
        :loading="loading"
        :disabled="!isCreate && !pageSave?.isDirty.value"
        :label="isCreate ? 'Create' : 'Save'" />
    </div>
  </UForm>
</template>
