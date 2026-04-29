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
  discountValue: (props.initialValues?.discountValue as number) ?? undefined,
  isActive: (props.initialValues?.isActive as boolean) ?? true,
  startDate: computed(() => formatCalendarDate(startDateCalendar.value) ?? null),
  endDate: computed(() => formatCalendarDate(endDateCalendar.value) ?? null),
  serviceIds: (props.initialValues?.serviceIds as number[]) ?? [],
});

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
            :label="state.discountType === 'percent' ? 'Discount (%)' : 'Discount ($)'"
            name="discountValue">
            <UInputNumber
              v-model="state.discountValue"
              :min="1"
              :max="state.discountType === 'percent' ? 100 : undefined"
              :step="state.discountType === 'percent' ? 1 : 0.01" />
          </UFormField>
        </div>
      </AppSection>

      <AppSection title="Options">
        <div class="space-y-4">
          <UFormField
            label="Active"
            name="isActive">
            <USwitch v-model="state.isActive" />
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
