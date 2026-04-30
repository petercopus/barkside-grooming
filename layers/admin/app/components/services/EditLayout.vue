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
  initialAddonLinks?: { baseServiceIds?: number[]; addonServiceIds?: number[] };
  serviceId?: number;
  title: string;
  backTo: string;
}>();

const isCreate = computed(() => props.mode === 'create');
const schema = computed(() => (isCreate.value ? createServiceSchema : updateServiceSchema));

const { data: allServicesData } = await useFetch('/api/admin/services');
const baseServices = computed(() =>
  (allServicesData.value?.services ?? []).filter((s) => !s.isAddon && s.id !== props.serviceId),
);
const addonServices = computed(() =>
  (allServicesData.value?.services ?? []).filter((s) => s.isAddon && s.id !== props.serviceId),
);

const { data: categoryData } = await useFetch('/api/admin/size-categories');
const categories = computed(() => categoryData.value?.categories ?? []);

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
  addonLinkIds:
    props.initialAddonLinks?.baseServiceIds ??
    props.initialAddonLinks?.addonServiceIds ??
    ([] as number[]),
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

function toggleAddonLink(id: number) {
  toggleArrayItem(state.addonLinkIds, id);
}

const create = isCreate.value
  ? useFormAction({
      redirectTo: (res: any) => `/admin/settings/services/${res.service.id}/edit`,
    })
  : null;

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
        addons: {
          track: () => [...state.addonLinkIds].sort(),
          save: (ids) =>
            $fetch(`/api/admin/services/${props.serviceId}/addons`, {
              method: 'PUT',
              body: state.isAddon ? { baseServiceIds: ids } : { addonServiceIds: ids },
            }),
        },
      },
      successMessage: 'Service updated',
    })
  : null;

const { discardChanges } = useDiscardable(state, pageSave);

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
  <AppFormLayout
    :title="title"
    :back-to="backTo"
    form-id="service-edit-form"
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
          label="Category"
          name="category">
          <UInput v-model="state.category" />
        </UFormField>

        <UFormField
          label="Description"
          name="description">
          <UTextarea v-model="state.description" />
        </UFormField>
      </div>
    </AppSection>

    <AppSection
      v-if="isCreate"
      title="Pricing by Size">
      <p class="text-sm text-muted">
        Pricing and durations are configured after the service is created. You'll be taken to the
        edit page on save.
      </p>
    </AppSection>

    <AppSection
      v-else
      title="Pricing by Size">
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
          <span class="font-medium text-sm">{{ sizeCategoryLabel[cat.name] ?? cat.name }}</span>

          <div class="flex gap-3">
            <UFormField
              label="Price ($)"
              class="flex-1">
              <UInputNumber
                v-model="state.pricingMap[cat.id]!.priceDollars"
                :min="0"
                :step="0.01"
                :step-snapping="false" />
            </UFormField>

            <UFormField
              label="Duration (min)"
              class="flex-1">
              <UInputNumber
                v-model="state.pricingMap[cat.id]!.durationMinutes"
                :min="1"
                :step="5"
                :step-snapping="false" />
            </UFormField>
          </div>
        </div>
      </div>
    </AppSection>

    <AppSection
      v-if="state.isAddon && !isCreate"
      title="Compatible Base Services">
      <div class="space-y-2">
        <UCheckbox
          v-for="service in baseServices"
          :key="service.id"
          :label="service.name"
          :model-value="state.addonLinkIds.includes(service.id)"
          @update:model-value="toggleAddonLink(service.id)" />
        <p
          v-if="baseServices.length === 0"
          class="text-sm text-muted">
          No base services exist yet.
        </p>
      </div>
    </AppSection>

    <AppSection
      v-if="!state.isAddon && !isCreate"
      title="Available Addons">
      <div class="space-y-2">
        <UCheckbox
          v-for="service in addonServices"
          :key="service.id"
          :label="service.name"
          :model-value="state.addonLinkIds.includes(service.id)"
          @update:model-value="toggleAddonLink(service.id)" />
        <p
          v-if="addonServices.length === 0"
          class="text-sm text-muted">
          No addon services exist yet.
        </p>
      </div>
    </AppSection>

    <template #sidebar>
      <AppSection title="Options">
        <div class="space-y-4">
          <UFormField
            label="Addon Service"
            name="isAddon">
            <USwitch v-model="state.isAddon" />
          </UFormField>

          <UFormField
            label="Sort Order"
            name="sortOrder">
            <UInputNumber
              v-model="state.sortOrder"
              :min="0" />
          </UFormField>
        </div>
      </AppSection>
    </template>
  </AppFormLayout>
</template>
