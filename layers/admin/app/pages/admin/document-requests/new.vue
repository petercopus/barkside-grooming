<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'document:request',
});

const form = useFormAction({
  redirectTo: '/admin/document-requests',
  successMessage: 'Document request created',
});

const { data: customerData } = await useFetch('/api/admin/customers');

const customerItems = computed(() =>
  (customerData.value?.customers ?? []).map((c) => ({
    label: `${c.firstName} ${c.lastName}`,
    value: c.id,
  })),
);

const state = reactive({
  targetUserId: undefined as string | undefined,
  petId: undefined as string | undefined,
  documentType: undefined as string | undefined,
  message: undefined as string | undefined,
  dueDate: undefined as string | undefined,
});

const dueDateCalendar = shallowRef();

// Load pets when customer changes
const petItems = ref<{ label: string; value: string }[]>([]);

watch(
  () => state.targetUserId,
  async (customerId) => {
    state.petId = undefined;
    petItems.value = [];

    if (!customerId) return;

    try {
      const data = await $fetch(`/api/admin/customers/${customerId}`);
      petItems.value = (data.customer?.pets ?? []).map((p) => ({
        label: p.name,
        value: p.id,
      }));
    } catch {
      petItems.value = [];
    }
  },
);

function onSubmit() {
  if (!state.targetUserId || !state.documentType) return;

  form.execute(() =>
    $fetch('/api/admin/document-requests', {
      method: 'POST',
      body: {
        targetUserId: state.targetUserId,
        petId: state.petId || undefined,
        type: state.documentType,
        message: state.message || undefined,
        dueDate: formatCalendarDate(dueDateCalendar.value) || undefined,
      },
    }),
  );
}
</script>

<template>
  <AppPage
    title="New Document Request"
    back-to="/admin/document-requests">
    <template #actions>
      <UButton
        to="/admin/document-requests"
        variant="ghost"
        size="sm"
        label="Cancel" />
      <UButton
        label="Send Request"
        icon="i-lucide-send"
        size="sm"
        :loading="form.loading.value"
        :disabled="!state.targetUserId || !state.documentType"
        @click="onSubmit" />
    </template>

    <AppSection :error="form.error.value">
      <div class="space-y-4">
        <UFormField
          label="Customer"
          required>
          <USelect
            v-model="state.targetUserId"
            :items="customerItems"
            placeholder="Select a customer" />
        </UFormField>

        <UFormField label="Pet">
          <USelect
            v-model="state.petId"
            :items="petItems"
            :disabled="!state.targetUserId || petItems.length === 0"
            placeholder="Select a pet (optional)" />
        </UFormField>

        <UFormField
          label="Document Type"
          required>
          <USelect
            v-model="state.documentType"
            :items="docTypeItems" />
        </UFormField>

        <UFormField label="Message">
          <UTextarea
            v-model="state.message"
            placeholder="Explain request..." />
        </UFormField>

        <UFormField label="Due Date">
          <AppDatePicker v-model="dueDateCalendar" />
        </UFormField>
      </div>
    </AppSection>
  </AppPage>
</template>
