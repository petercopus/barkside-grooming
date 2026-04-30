<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { createPetSchema, updatePetSchema, type CreatePetInput } from '~~/shared/schemas/pet';

const props = defineProps<{
  mode: 'create' | 'edit';
  initialValues?: Record<string, unknown>;
  petId?: string;
}>();

const isCreate = computed(() => props.mode === 'create');
const schema = computed(() => (isCreate.value ? createPetSchema : updatePetSchema));

/* ─────────────────────────────────── *
 *  Form State
 * ─────────────────────────────────── */
const dobCalendar = shallowRef(
  parseCalendarDate(props.initialValues?.dateOfBirth as string | undefined),
);

const state = reactive({
  name: (props.initialValues?.name as string) ?? undefined,
  breed: (props.initialValues?.breed as string) ?? undefined,
  weightLbs: (props.initialValues?.weightLbs as number) ?? undefined,
  dateOfBirth: computed(() => formatCalendarDate(dobCalendar.value)),
  gender: (props.initialValues?.gender as CreatePetInput['gender']) ?? undefined,
  coatType: (props.initialValues?.coatType as string) ?? undefined,
  specialNotes: (props.initialValues?.specialNotes as string) ?? undefined,
});

const genderItems = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

/* ─────────────────────────────────── *
 *  Create Mode
 * ─────────────────────────────────── */
const create = isCreate.value ? useFormAction({ redirectTo: '/me/pets' }) : null;

/* ─────────────────────────────────── *
 *  Edit Mode
 * ─────────────────────────────────── */
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
          save: (data) => $fetch(`/api/pets/${props.petId}`, { method: 'PATCH', body: data }),
        },
      },
      successMessage: 'Pet updated',
    })
  : null;

/* ─────────────────────────────────── *
 *  Submit
 * ─────────────────────────────────── */
const loading = computed(() => (isCreate.value ? create!.loading.value : pageSave!.loading.value));
const error = computed(() => (isCreate.value ? create!.error.value : pageSave!.error.value));

function onSubmit(_event: FormSubmitEvent<unknown>) {
  if (isCreate.value) {
    create!.execute(() =>
      $fetch('/api/pets', { method: 'POST', body: _event.data as CreatePetInput }),
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
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main column -->
      <div class="lg:col-span-2 space-y-6">
        <AppSectionPanel
          kicker="The basics"
          title="Pup details"
          description="Name, breed, and the essentials we need to size up the visit."
          icon="i-lucide-paw-print"
          :error="error">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField
              label="Name"
              name="name"
              required>
              <UInput
                v-model="state.name"
                placeholder="e.g. Biscuit"
                size="lg"
                class="w-full" />
            </UFormField>

            <UFormField
              label="Breed"
              name="breed">
              <UInput
                v-model="state.breed"
                placeholder="Mixed, Labrador, …"
                size="lg"
                class="w-full" />
            </UFormField>

            <UFormField
              label="Weight (lbs)"
              name="weightLbs"
              hint="Helps us pick the right size"
              :required="isCreate">
              <UInputNumber
                v-model="state.weightLbs"
                :min="1"
                :max="300"
                size="lg"
                class="w-full" />
            </UFormField>

            <UFormField
              label="Date of birth"
              name="dateOfBirth">
              <AppDatePicker v-model="dobCalendar" />
            </UFormField>
          </div>
        </AppSectionPanel>

        <AppSectionPanel
          kicker="Optional"
          title="Notes for the team"
          description="Temperament, sensitivities, special requests — anything we should know."
          icon="i-lucide-message-square">
          <UFormField name="specialNotes">
            <UTextarea
              v-model="state.specialNotes"
              :rows="4"
              placeholder="e.g. A bit nervous around clippers, loves a cheek scratch."
              class="w-full" />
          </UFormField>
        </AppSectionPanel>
      </div>

      <!-- Side column -->
      <div class="space-y-6">
        <AppSectionPanel
          kicker="Looks & traits"
          title="Characteristics"
          icon="i-lucide-sparkles">
          <div class="space-y-4">
            <UFormField
              label="Gender"
              name="gender">
              <USelect
                v-model="state.gender"
                :items="genderItems"
                size="lg"
                class="w-full" />
            </UFormField>

            <UFormField
              label="Coat type"
              name="coatType"
              hint="Short, double, curly, wire…">
              <UInput
                v-model="state.coatType"
                placeholder="e.g. Curly"
                size="lg"
                class="w-full" />
            </UFormField>
          </div>
        </AppSectionPanel>

        <div
          class="rounded-2xl bg-primary-50/40 border border-primary-100/70 px-4 py-4 text-sm text-barkside-800">
          <div class="flex items-start gap-2.5">
            <UIcon
              name="i-lucide-info"
              class="size-4 text-primary-500 shrink-0 mt-0.5" />

            <p class="leading-relaxed">
              Adding accurate weight + coat type means we can pre-quote services and pick the right
              brush before your pup walks in.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-8">
      <UButton
        to="/me/pets"
        variant="ghost"
        size="lg"
        label="Cancel" />
      <UButton
        type="submit"
        size="lg"
        :loading="loading"
        :disabled="!isCreate && !pageSave?.isDirty.value"
        :icon="isCreate ? 'i-lucide-plus' : 'i-lucide-check'"
        :label="isCreate ? 'Add pup' : 'Save changes'" />
    </div>
  </UForm>
</template>
