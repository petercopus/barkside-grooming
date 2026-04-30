<script setup lang="ts">
import { MAX_FILE_SIZE, type UploadDocumentInput } from '~~/shared/schemas/document';

type DocumentType = UploadDocumentInput['type'];

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
  type: (prefillType as DocumentType | undefined) ?? undefined,
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
</script>

<template>
  <div class="cms-container py-10 sm:py-14 max-w-3xl">
    <AppPageIntro
      kicker="New upload"
      title="Upload a document"
      description="PDFs and images up to 10 MB. We'll review it and link it to the right pup."
      back-to="/me/documents" />

    <div class="mt-8 space-y-6">
      <AppSectionPanel
        kicker="Step 1"
        title="Choose a file"
        description="PDF, JPG, or PNG."
        icon="i-lucide-paperclip"
        :error="form.error.value">
        <UFormField
          required
          :error="fileError ?? undefined">
          <UFileUpload
            v-model="file"
            accept=".pdf,.jpg,.jpeg,.png"
            class="w-full" />
        </UFormField>

        <div
          v-if="file"
          class="mt-3 flex items-center gap-3 rounded-xl bg-primary-50/40 border border-primary-100/70 px-3 py-2.5 text-sm">
          <UIcon
            name="i-lucide-file-check"
            class="size-4 text-primary-500 shrink-0" />

          <span class="font-medium text-default truncate">{{ file.name }}</span>
          <span class="text-muted tabular-nums shrink-0">{{ formatBytes(file.size) }}</span>

          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            class="ml-auto"
            aria-label="Remove file"
            @click="file = null" />
        </div>
      </AppSectionPanel>

      <AppSectionPanel
        kicker="Step 2"
        title="Document details"
        description="Tag the type and link to a pup so we can find it fast."
        icon="i-lucide-tag">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField
            label="Document type"
            required>
            <USelect
              v-model="state.type"
              :items="docTypeItems"
              :disabled="!!prefillType"
              size="lg"
              class="w-full" />
          </UFormField>

          <UFormField
            label="Pet"
            hint="Optional">
            <USelect
              v-model="state.petId"
              :items="petItems"
              placeholder="Select a pup"
              :disabled="!!prefillPetId"
              size="lg"
              class="w-full" />
          </UFormField>
        </div>

        <UFormField
          label="Notes"
          hint="Optional"
          class="mt-4">
          <UTextarea
            v-model="state.notes"
            :rows="3"
            placeholder="e.g. Updated rabies booster, valid through 2026."
            class="w-full" />
        </UFormField>
      </AppSectionPanel>

      <div
        class="rounded-2xl bg-primary-50/40 border border-primary-100/70 px-4 py-3 text-sm text-barkside-800">
        <div class="flex items-start gap-2.5">
          <UIcon
            name="i-lucide-shield-check"
            class="size-4 text-primary-500 shrink-0 mt-0.5" />

          <p class="leading-relaxed">
            Documents are encrypted in transit and only visible to your groomers.
          </p>
        </div>
      </div>

      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <UButton
          to="/me/documents"
          variant="ghost"
          size="lg"
          label="Cancel" />
        <UButton
          :loading="form.loading.value"
          :disabled="!file || !state.type"
          icon="i-lucide-upload"
          size="lg"
          label="Upload"
          @click="onSubmit" />
      </div>
    </div>
  </div>
</template>
