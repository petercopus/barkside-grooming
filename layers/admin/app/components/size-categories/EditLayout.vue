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
  title: string;
  backTo: string;
}>();

const isCreate = computed(() => props.mode === 'create');
const schema = computed(() =>
  isCreate.value ? createSizeCategorySchema : updateSizeCategorySchema,
);

const state = reactive({
  name: (props.initialValues?.name as string) ?? undefined,
  minWeight: (props.initialValues?.minWeight as number) ?? undefined,
  maxWeight: (props.initialValues?.maxWeight as number) ?? undefined,
});

const create = isCreate.value
  ? useFormAction({
      redirectTo: (res: any) => `/admin/settings/size-categories/${res.category.id}/edit`,
    })
  : null;

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
  <AppFormLayout
    :title="title"
    :back-to="backTo"
    width="content"
    form-id="size-category-edit-form"
    :schema="schema"
    :state="state"
    :mode="mode"
    :loading="loading"
    :is-dirty="pageSave?.isDirty.value ?? false"
    @submit="onSubmit"
    @discard="discardChanges">
    <template
      v-if="$slots['extra-actions']"
      #extra-actions>
      <slot name="extra-actions" />
    </template>

    <AppSection :error="error">
      <div class="space-y-4">
        <UFormField
          label="Name"
          name="name"
          required>
          <UInput v-model="state.name" />
        </UFormField>

        <UFormField
          label="Min Weight (lbs)"
          name="minWeight"
          required>
          <UInputNumber
            v-model="state.minWeight"
            :min="0" />
        </UFormField>

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
  </AppFormLayout>
</template>
