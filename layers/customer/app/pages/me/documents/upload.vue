<script setup lang="ts">
import { MAX_FILE_SIZE } from '~~/shared/schemas/document';

definePageMeta({
  layout: 'site',
  middleware: 'auth',
});

const route = useRoute();
const prefillRequestId = route.query.requestId as string | undefined;
const prefillType = route.query.type as string | undefined;
const prefillPetId = route.query.petId as string | undefined;

const { data: petData } = await useFetch('/api/pets');
const form = useFormAction({
  redirectTo: '/me/documents',
  successMessage: 'Document uploaded',
});

const state = reactive({
  type: prefillType ?? (undefined as string | undefined),
  petId: prefillPetId ?? (undefined as string | undefined),
  notes: undefined as string | undefined,
});

const file = ref<File | null>(null);
const fileError = ref<string | null>(null);

const petItems = computed(() =>
  (petData.value?.pets ?? []).map((p) => ({ label: p.name, value: p.id })),
);

watch(file, (selected) => {
  fileError.value = null;

  if (selected && selected.size > MAX_FILE_SIZE) {
    fileError.value = 'File exceeds size limit';
    file.value = null;
  }
});

function onSubmit() {
  if (!file.value || !state.type) return;

  form.execute(() => {
    const fd = new FormData();
    fd.append('file', file.value!);
    fd.append('type', state.type!);

    if (state.petId) fd.append('petId', state.petId);
    if (state.notes) fd.append('notes', state.notes);
    if (prefillRequestId) fd.append('documentRequestId', prefillRequestId);

    return $fetch('/api/documents', { method: 'POST', body: fd });
  });
}
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      title="Upload Document"
      back-to="/me/documents" />

    <AppSection :error="form.error.value">
      <div class="space-y-4">
        <!-- File input -->
        <UFormField
          label="Document"
          required
          :error="fileError ?? undefined">
          <UFileUpload
            v-model="file"
            accept=".pdf,.jpg,.jpeg,.png" />
        </UFormField>

        <!-- Document type -->
        <UFormField
          label="Document Type"
          required>
          <USelect
            v-model="state.type"
            :items="docTypeItems"
            :disabled="!!prefillType" />
        </UFormField>

        <!-- Pet selector -->
        <UFormField label="Pet">
          <USelect
            v-model="state.petId"
            :items="petItems"
            placeholder="Select a pet (optional)"
            :disabled="!!prefillPetId" />
        </UFormField>

        <!-- Notes -->
        <UFormField label="Notes">
          <UTextarea v-model="state.notes" />
        </UFormField>
      </div>
    </AppSection>

    <div class="flex justify-end gap-2">
      <UButton
        to="/me/documents"
        variant="ghost"
        label="Cancel" />
      <UButton
        :loading="form.loading.value"
        :disabled="!file || !state.type"
        label="Upload"
        icon="i-lucide-upload"
        @click="onSubmit" />
    </div>
  </div>
</template>
