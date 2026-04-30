<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import {
  createBundleSchema,
  updateBundleSchema,
  type CreateBundleInput,
} from '~~/shared/schemas/bundle';

const props = defineProps<{
  mode: 'create' | 'edit';
  initialValues?: Record<string, unknown>;
  bundleId?: number;
  title: string;
  backTo: string;
}>();

const isCreate = computed(() => props.mode === 'create');
const schema = computed(() => (isCreate.value ? createBundleSchema : updateBundleSchema));

const { data: servicesData } = await useFetch('/api/admin/services');
const allServices = computed(() => servicesData.value?.services ?? []);

const { data: sizeCategoriesData } = await useFetch('/api/admin/size-categories');
const sizeCategories = computed(() => sizeCategoriesData.value?.categories ?? []);

const startDateCalendar = shallowRef(parseCalendarDate(props.initialValues?.startDate as string));
const endDateCalendar = shallowRef(parseCalendarDate(props.initialValues?.endDate as string));

const discountTypeOptions = [
  { label: 'Percentage', value: 'percent' },
  { label: 'Fixed Amount', value: 'fixed' },
];

const selectedDiscountType = computed({
  get: () => discountTypeOptions.find((o) => o.value === state.discountType),
  set: (option) => {
    if (option) state.discountType = option.value as 'percent' | 'fixed';
  },
});

const state = reactive({
  name: (props.initialValues?.name as string) ?? undefined,
  description: (props.initialValues?.description as string) ?? undefined,
  discountType: (props.initialValues?.discountType as 'percent' | 'fixed') ?? 'percent',
  discountValue: ((props.initialValues?.discountValue as number) ?? undefined) as
    | number
    | undefined,
  isActive: (props.initialValues?.isActive as boolean) ?? true,
  startDate: computed(() => formatCalendarDate(startDateCalendar.value) ?? null),
  endDate: computed(() => formatCalendarDate(endDateCalendar.value) ?? null),
  serviceIds: (props.initialValues?.serviceIds as number[]) ?? [],
});

const discountAmountDollars = computed({
  get: () =>
    state.discountValue == null || state.discountType !== 'fixed'
      ? undefined
      : state.discountValue / 100,
  set: (v) => {
    state.discountValue = v == null ? undefined : Math.round(v * 100);
  },
});

const previewRows = computed<Record<string, unknown>[]>(() => {
  if (state.serviceIds.length < 2) return [];

  const selected = allServices.value.filter((s) =>
    state.serviceIds.includes(s.id as number),
  ) as Array<{
    id: number;
    name: string;
    pricing?: Array<{ sizeCategoryId: number; priceCents: number }>;
  }>;

  return sizeCategories.value.map((size) => {
    const subtotalCents = selected.reduce((sum, s) => {
      const p = s.pricing?.find((pr) => pr.sizeCategoryId === size.id);
      return sum + (p?.priceCents ?? 0);
    }, 0);

    const discountCents =
      state.discountValue == null || subtotalCents === 0
        ? 0
        : state.discountType === 'percent'
          ? Math.round(subtotalCents * (state.discountValue / 100))
          : Math.min(state.discountValue, subtotalCents);

    return {
      sizeName: sizeCategoryLabel[size.name] ?? size.name,
      subtotalCents,
      discountCents,
      totalCents: Math.max(0, subtotalCents - discountCents),
    };
  });
});

const previewColumns = [
  { accessorKey: 'sizeName', header: 'Size' },
  { accessorKey: 'subtotalCents', header: 'Subtotal' },
  { accessorKey: 'discountCents', header: 'Discount' },
  { accessorKey: 'totalCents', header: 'Total' },
];

function toggleService(id: number) {
  toggleArrayItem(state.serviceIds, id);
}

const create = isCreate.value
  ? useFormAction({
      redirectTo: (res: any) => `/admin/settings/bundles/${res.bundle.id}/edit`,
    })
  : null;

const pageSave = !isCreate.value
  ? usePageSave({
      sections: {
        details: {
          track: () => ({
            name: state.name,
            description: state.description,
            discountType: state.discountType,
            discountValue: state.discountValue,
            isActive: state.isActive,
            startDate: state.startDate,
            endDate: state.endDate,
            serviceIds: [...state.serviceIds].sort(),
          }),
          save: (data) =>
            $fetch(`/api/admin/bundles/${props.bundleId}`, {
              method: 'PATCH',
              body: data,
            }),
        },
      },
      successMessage: 'Bundle updated',
    })
  : null;

const { discardChanges } = useDiscardable(state, pageSave);

const loading = computed(() => (isCreate.value ? create!.loading.value : pageSave!.loading.value));
const error = computed(() => (isCreate.value ? create!.error.value : pageSave!.error.value));

function onSubmit(event: FormSubmitEvent<unknown>) {
  if (isCreate.value) {
    create!.execute(() =>
      $fetch('/api/admin/bundles', {
        method: 'POST',
        body: event.data as CreateBundleInput,
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
    form-id="bundle-edit-form"
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
          label="Description"
          name="description">
          <UTextarea v-model="state.description" />
        </UFormField>
      </div>
    </AppSection>

    <AppSection title="Bundle Services">
      <p class="text-sm text-muted mb-3">Select atleast 2 services to include in this bundle.</p>
      <div class="space-y-2">
        <UCheckbox
          v-for="service in allServices"
          :key="service.id"
          :label="`${service.name}${service.isAddon ? ' (Addon)' : ''}`"
          :model-value="state.serviceIds.includes(service.id)"
          @update:model-value="toggleService(service.id)" />
      </div>
    </AppSection>

    <AppSection title="Preview">
      <p
        v-if="state.serviceIds.length < 2"
        class="text-sm text-muted">
        Select atleast 2 services to see the discounted total per size.
      </p>

      <AppTable
        v-else
        :columns="previewColumns"
        :data="previewRows"
        :show-row-chevron="false">
        <template #subtotalCents-cell="{ row }">
          <span class="tabular-nums">
            {{ formatCurrency(row.original.subtotalCents as number) }}
          </span>
        </template>

        <template #discountCents-cell="{ row }">
          <span class="tabular-nums text-muted">
            -{{ formatCurrency(row.original.discountCents as number) }}
          </span>
        </template>

        <template #totalCents-cell="{ row }">
          <span class="tabular-nums font-medium">
            {{ formatCurrency(row.original.totalCents as number) }}
          </span>
        </template>
      </AppTable>
    </AppSection>

    <template #sidebar>
      <AppSection title="Discount">
        <div class="space-y-4">
          <UFormField
            label="Discount Type"
            name="discountType">
            <USelectMenu
              v-model="selectedDiscountType"
              :items="discountTypeOptions" />
          </UFormField>

          <UFormField
            v-if="state.discountType === 'percent'"
            label="Discount (%)"
            name="discountValue">
            <UInputNumber
              v-model="state.discountValue"
              :min="1"
              :max="100"
              :step="1" />
          </UFormField>

          <UFormField
            v-else
            label="Discount ($)"
            name="discountValue">
            <UInputNumber
              v-model="discountAmountDollars"
              :min="0.01"
              :step="0.01"
              :step-snapping="false"
              :format-options="{ style: 'currency', currency: 'USD' }" />
          </UFormField>
        </div>
      </AppSection>

      <AppSection title="Options">
        <div class="space-y-4">
          <UFormField name="isActive">
            <USwitch
              v-model="state.isActive"
              label="Active" />
          </UFormField>

          <UFormField
            label="Start Date"
            name="startDate">
            <AppDatePicker v-model="startDateCalendar" />
          </UFormField>

          <UFormField
            label="End Date"
            name="endDate">
            <AppDatePicker v-model="endDateCalendar" />
          </UFormField>
        </div>
      </AppSection>
    </template>
  </AppFormLayout>
</template>
