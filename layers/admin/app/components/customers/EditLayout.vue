<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
} from '~~/shared/schemas/customer';

const props = defineProps<{
  mode: 'create' | 'edit';
  initialValues?: Record<string, unknown>;
  customerId?: string;
  title: string;
  backTo: string;
}>();

const isCreate = computed(() => props.mode === 'create');
const schema = computed(() => (isCreate.value ? createCustomerSchema : updateCustomerSchema));

const state = reactive({
  email: (props.initialValues?.email as string) ?? undefined,
  password: undefined as string | undefined,
  firstName: (props.initialValues?.firstName as string) ?? undefined,
  lastName: (props.initialValues?.lastName as string) ?? undefined,
  phone: (props.initialValues?.phone as string) ?? '',
});

const create = isCreate.value
  ? useFormAction({
      redirectTo: (res: any) => `/admin/customers/${res.customer.id}`,
    })
  : null;

const pageSave = !isCreate.value
  ? usePageSave({
      sections: {
        details: {
          track: () => ({
            firstName: state.firstName,
            lastName: state.lastName,
            email: state.email,
            phone: state.phone,
          }),
          save: (data) =>
            $fetch(`/api/admin/customers/${props.customerId}`, { method: 'PATCH', body: data }),
        },
      },
      successMessage: 'Customer updated',
    })
  : null;

const { discardChanges } = useDiscardable(state, pageSave);

const loading = computed(() => (isCreate.value ? create!.loading.value : pageSave!.loading.value));
const error = computed(() => (isCreate.value ? create!.error.value : pageSave!.error.value));

function onSubmit(event: FormSubmitEvent<unknown>) {
  if (isCreate.value) {
    create!.execute(() =>
      $fetch('/api/admin/customers', {
        method: 'POST',
        body: event.data as CreateCustomerInput,
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
    form-id="customer-edit-form"
    :schema="schema"
    :state="state"
    :mode="mode"
    :loading="loading"
    :is-dirty="pageSave?.isDirty.value ?? false"
    :create-label="'Create Customer'"
    @submit="onSubmit"
    @discard="discardChanges">
    <template
      v-if="$slots['extra-actions']"
      #extra-actions>
      <slot name="extra-actions" />
    </template>

    <AppSection
      title="Details"
      :error="error">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField
          name="firstName"
          label="First Name">
          <UInput v-model="state.firstName" />
        </UFormField>

        <UFormField
          name="lastName"
          label="Last Name">
          <UInput v-model="state.lastName" />
        </UFormField>

        <UFormField
          name="email"
          label="Email">
          <UInput
            v-model="state.email"
            type="email" />
        </UFormField>

        <UFormField
          name="phone"
          label="Phone">
          <UInput v-model="state.phone" />
        </UFormField>

        <UFormField
          v-if="isCreate"
          label="Temporary Password"
          name="password"
          class="md:col-span-2"
          help="The customer can change this after their first sign-in.">
          <UInput
            v-model="state.password"
            type="password" />
        </UFormField>
      </div>
    </AppSection>
  </AppFormLayout>
</template>
