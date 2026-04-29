<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import {
  createAdminPetSchema,
  updatePetSchema,
  type CreateAdminPetInput,
} from '~~/shared/schemas/pet';

const props = defineProps<{
  mode: 'create' | 'edit';
  initialValues?: Record<string, unknown>;
  petId?: string;
  defaultOwnerId?: string;
  title: string;
  backTo: string;
}>();

const isCreate = computed(() => props.mode === 'create');
const schema = computed(() => (isCreate.value ? createAdminPetSchema : updatePetSchema));

const { data: customersData } = await useFetch('/api/admin/customers', {
  immediate: isCreate.value,
});

const customerOptions = computed(() =>
  (customersData.value?.customers ?? []).map((c) => ({
    label: `${c.name}${c.email ? ` · ${c.email}` : ''}`,
    value: c.id,
  })),
);

const dobCalendar = shallowRef(
  parseCalendarDate(props.initialValues?.dateOfBirth as string | undefined),
);

const state = reactive({
  ownerId:
    (props.initialValues?.ownerId as string) ??
    props.defaultOwnerId ??
    (undefined as string | undefined),
  name: (props.initialValues?.name as string) ?? undefined,
  breed: (props.initialValues?.breed as string) ?? undefined,
  weightLbs: (props.initialValues?.weightLbs as number) ?? undefined,
  dateOfBirth: computed(() => formatCalendarDate(dobCalendar.value)),
  gender: (props.initialValues?.gender as 'male' | 'female' | undefined) ?? undefined,
  coatType: (props.initialValues?.coatType as string) ?? undefined,
  specialNotes: (props.initialValues?.specialNotes as string) ?? undefined,
});

const genderItems = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

const coatTypeItems = Object.entries(coatTypeLabel).map(([value, label]) => ({ label, value }));

const create = isCreate.value
  ? useFormAction({
      redirectTo: (res: any) => `/admin/pets/${res.pet.id}`,
    })
  : null;

const pageSave = !isCreate.value
  ? usePageSave({
      sections: {
        details: {
          track: () => ({
            name: state.name,
            breed: state.breed,
            weightLbs: state.weightLbs,
            dateOfBirth: state.dateOfBirth,
            gender: state.gender,
            coatType: state.coatType,
            specialNotes: state.specialNotes,
          }),
          save: (data) => $fetch(`/api/admin/pets/${props.petId}`, { method: 'PATCH', body: data }),
        },
      },
      successMessage: 'Pet updated',
    })
  : null;

const { discardChanges } = useDiscardable(state, pageSave);

const loading = computed(() => (isCreate.value ? create!.loading.value : pageSave!.loading.value));
const error = computed(() => (isCreate.value ? create!.error.value : pageSave!.error.value));

function onSubmit(event: FormSubmitEvent<unknown>) {
  if (isCreate.value) {
    create!.execute(() =>
      $fetch('/api/admin/pets', {
        method: 'POST',
        body: event.data as CreateAdminPetInput,
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
    form-id="pet-edit-form"
    :schema="schema"
    :state="state"
    :mode="mode"
    :loading="loading"
    :is-dirty="pageSave?.isDirty.value ?? false"
    :create-label="'Add Pet'"
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
          v-if="isCreate"
          label="Owner"
          name="ownerId"
          required>
          <USelectMenu
            v-model="state.ownerId"
            :items="customerOptions"
            value-key="value"
            placeholder="Select a customer..."
            class="w-full" />
        </UFormField>

        <UFormField
          label="Name"
          name="name"
          required>
          <UInput v-model="state.name" />
        </UFormField>

        <UFormField
          label="Breed"
          name="breed">
          <UInput v-model="state.breed" />
        </UFormField>

        <UFormField
          label="Weight (lbs)"
          name="weightLbs">
          <UInputNumber
            v-model="state.weightLbs"
            :min="1"
            :max="300" />
        </UFormField>

        <UFormField
          label="Date of Birth"
          name="dateOfBirth">
          <AppDatePicker v-model="dobCalendar" />
        </UFormField>
      </div>
    </AppSection>

    <template #sidebar>
      <AppSection title="Characteristics">
        <div class="space-y-4">
          <UFormField
            label="Gender"
            name="gender">
            <USelect
              v-model="state.gender"
              :items="genderItems" />
          </UFormField>

          <UFormField
            label="Coat Type"
            name="coatType">
            <USelect
              v-model="state.coatType"
              :items="coatTypeItems" />
          </UFormField>
        </div>
      </AppSection>

      <AppSection title="Notes">
        <UFormField name="specialNotes">
          <UTextarea v-model="state.specialNotes" />
        </UFormField>
      </AppSection>
    </template>
  </AppFormLayout>
</template>
