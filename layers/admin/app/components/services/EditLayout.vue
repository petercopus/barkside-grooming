<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import {
  createServiceSchema,
  updateServiceSchema,
  type CreateServiceInput,
} from '~~/shared/schemas/service';

const props = defineProps<{
  mode: 'create' | 'edit';
  initialValues?: Record<string, unknown>;
  initialPricing?: { sizeCategoryId: number; priceCents: number; durationMinutes: number }[];
  serviceId?: number;
}>();

const isCreate = computed(() => props.mode === 'create');
const schema = computed(() => (isCreate.value ? createServiceSchema : updateServiceSchema));

const { data: categoryData } = await useFetch('/api/admin/size-categories');
const categories = computed(() => categoryData.value?.categories ?? []);

/* ─────────────────────────────────── *
 *  Form State
 * ─────────────────────────────────── */
const pricingMap: Record<
  number,
  { priceDollars: number | undefined; durationMinutes: number | undefined }
> = {};

for (const cat of categories.value) {
  const existing = props.initialPricing?.find((p) => p.sizeCategoryId === cat.id);
  pricingMap[cat.id] = {
    priceDollars: existing ? existing.priceCents / 100 : undefined,
    durationMinutes: existing?.durationMinutes ?? undefined,
  };
}

const state = reactive({
  name: (props.initialValues?.name as string) ?? undefined,
  description: (props.initialValues?.description as string) ?? undefined,
  category: (props.initialValues?.category as string) ?? undefined,
  isAddon: (props.initialValues?.isAddon as boolean) ?? false,
  sortOrder: (props.initialValues?.sortOrder as number) ?? 0,
  pricingMap,
});

function buildPricingRows() {
  return Object.entries(state.pricingMap)
    .filter(([_, v]) => v.priceDollars != null && v.durationMinutes != null)
    .map(([sizeCategoryId, v]) => ({
      sizeCategoryId: Number(sizeCategoryId),
      priceCents: Math.round(v.priceDollars! * 100),
      durationMinutes: v.durationMinutes!,
    }));
}

/* ─────────────────────────────────── *
 *  Create Mode
 * ─────────────────────────────────── */
const create = isCreate.value
  ? useFormAction({
      redirectTo: (res: any) => `/admin/settings/services/${res.service.id}/edit`,
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
            description: state.description,
            category: state.category,
            isAddon: state.isAddon,
            sortOrder: state.sortOrder,
          }),
          save: (data) =>
            $fetch(`/api/admin/services/${props.serviceId}`, { method: 'PATCH', body: data }),
        },
        pricing: {
          track: () => buildPricingRows(),
          save: (rows) =>
            $fetch(`/api/admin/services/${props.serviceId}/pricing`, {
              method: 'PUT',
              body: { pricing: rows },
            }),
        },
      },
      successMessage: 'Service updated',
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
      $fetch('/api/admin/services', { method: 'POST', body: event.data as CreateServiceInput }),
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
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] items-start gap-6">
      <!-- Left -->
      <div class="space-y-6">
        <AppSection :error="error">
          <div class="space-y-4">
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

            <!-- Description -->
            <UFormField
              label="Description"
              name="description">
              <UTextarea v-model="state.description" />
            </UFormField>
          </div>
        </AppSection>

        <AppSection title="Pricing by Size">
          <div
            v-if="!categories.length"
            class="text-sm text-muted">
            No size categories found.
          </div>

          <div
            v-else
            class="space-y-3">
            <div
              v-for="cat in categories"
              :key="cat.id"
              class="p-3 border border-default rounded-lg space-y-2">
              <span class="font-medium text-sm">{{ cat.name }}</span>

              <div class="flex gap-3">
                <!-- Price -->
                <UFormField
                  label="Price ($)"
                  class="flex-1">
                  <UInputNumber
                    v-model="state.pricingMap[cat.id]!.priceDollars"
                    :min="0"
                    :step="0.01" />
                </UFormField>

                <!-- Duration -->
                <UFormField
                  label="Duration (min)"
                  class="flex-1">
                  <UInputNumber
                    v-model="state.pricingMap[cat.id]!.durationMinutes"
                    :min="1"
                    :step="5" />
                </UFormField>
              </div>
            </div>
          </div>
        </AppSection>
      </div>

      <!-- Right -->
      <div class="space-y-6">
        <AppSection title="Options">
          <div class="space-y-4">
            <!-- Addon switch -->
            <UFormField
              label="Addon Service"
              name="isAddon">
              <USwitch v-model="state.isAddon" />
            </UFormField>

            <!-- Sort order -->
            <UFormField
              label="Sort Order"
              name="sortOrder">
              <UInputNumber
                v-model="state.sortOrder"
                :min="0" />
            </UFormField>
          </div>
        </AppSection>
      </div>
    </div>

    <div class="flex justify-end gap-2 mt-6">
      <UButton
        v-if="isCreate"
        to="/admin/settings/services"
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
