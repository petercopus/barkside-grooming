<script setup lang="ts">
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '~~/shared/schemas/document';

const props = defineProps<{
  appointmentId: string;
  appointmentPetId: string;
  petName: string;
}>();

const emit = defineEmits<{ uploaded: [] }>();

const file = ref<File | null>(null);
const fileError = ref<string | null>(null);
const submitError = ref<string | null>(null);
const uploading = ref(false);
const uploaded = ref(false);

watch(file, (selected) => {
  fileError.value = null;
  submitError.value = null;
  if (!selected) return;

  if (selected.size > MAX_FILE_SIZE) {
    fileError.value = 'File exceeds the 10 MB size limit';
    file.value = null;

    return;
  }

  if (!ALLOWED_MIME_TYPES.includes(selected.type)) {
    fileError.value = 'Only PDF, JPEG, or PNG files are allowed';
    file.value = null;

    return;
  }
});

async function onSubmit() {
  if (!file.value) return;

  uploading.value = true;
  submitError.value = null;

  try {
    const fd = new FormData();
    fd.append('file', file.value);
    fd.append('appointmentPetId', props.appointmentPetId);

    await $fetch(`/api/appointments/${props.appointmentId}/upload-vaccination`, {
      method: 'POST',
      body: fd,
    });

    uploaded.value = true;
    emit('uploaded');
  } catch (err: any) {
    submitError.value = err?.data?.message ?? 'Upload failed. Please try again.';
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <AppCard>
    <div class="flex items-center justify-between gap-3 mb-4">
      <div>
        <p class="font-medium">{{ petName }}</p>
        <p class="text-sm text-muted">Vaccination record</p>
      </div>

      <UIcon
        v-if="uploaded"
        name="i-lucide-check-circle-2"
        class="h-5 w-5 text-success" />
    </div>

    <template v-if="!uploaded">
      <UFormField
        label="File"
        :error="fileError ?? undefined"
        class="mb-4"
        required>
        <UFileUpload
          v-model="file"
          accept=".pdf,.jpg,.jpeg,.png" />
      </UFormField>

      <p
        v-if="submitError"
        class="text-sm text-error">
        {{ submitError }}
      </p>

      <div class="flex justify-end">
        <UButton
          :loading="uploading"
          :disabled="!file"
          label="Upload"
          icon="i-lucide-upload"
          @click="onSubmit" />
      </div>
    </template>
  </AppCard>
</template>
