<script setup lang="ts">
import { updateCustomerSchema } from '~~/shared/schemas/customer';

const props = defineProps<{
  initialValues: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  customerId: string;
}>();

const state = reactive({
  firstName: props.initialValues.firstName,
  lastName: props.initialValues.lastName,
  email: props.initialValues.email,
  phone: props.initialValues.phone ?? '',
});

const pageSave = usePageSave({
  sections: {
    details: {
      track: () => ({
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
        phone: state.phone,
      }),
      save: (data) =>
        $fetch(`/api/admin/customers/${props.customerId}`, {
          method: 'PATCH',
          body: data,
        }),
    },
  },
  successMessage: 'Customer updated',
});
const { submit, isDirty, error, loading } = pageSave;

const { discardChanges } = useDiscardable(state, pageSave);
</script>

<template>
  <UForm
    :schema="updateCustomerSchema"
    :state="state"
    @submit="submit">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <AppSection
          title="Details"
          :error="error">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- first name -->
            <UFormField
              name="firstName"
              label="First Name">
              <UInput v-model="state.firstName" />
            </UFormField>

            <!-- last name -->
            <UFormField
              name="lastName"
              label="Last Name">
              <UInput v-model="state.lastName" />
            </UFormField>

            <!-- email -->
            <UFormField
              name="email"
              label="Email">
              <UInput
                v-model="state.email"
                type="email" />
            </UFormField>

            <!-- phone -->
            <UFormField
              name="phone"
              label="Phone">
              <UInput v-model="state.phone" />
            </UFormField>
          </div>
        </AppSection>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2 mt-6">
      <UButton
        v-if="isDirty"
        label="Discard"
        color="neutral"
        variant="ghost"
        @click="discardChanges" />
      <UButton
        type="submit"
        label="Save"
        :loading="loading"
        :disabled="!isDirty" />
    </div>
  </UForm>
</template>
