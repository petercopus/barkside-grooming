<script setup lang="ts">
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '~~/shared/schemas/document';

definePageMeta({ layout: 'site' });

useHead({ title: 'Upload Vaccination Record — Barkside Grooming' });

type AvailableContext = {
  state: 'available';
  petName: string;
  scheduledDate: string | null;
  startTime: string | null;
  expiresAt: string | null;
};
type UnavailableContext = { state: 'used' | 'expired' };
type Context = AvailableContext | UnavailableContext;

const route = useRoute();
const token = computed(() => route.params.token as string);

const { data, error, refresh } = await useFetch<Context>(() => `/api/upload/${token.value}`, {
  server: false,
});

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
  }
});

async function onSubmit() {
  if (!file.value) return;

  uploading.value = true;
  submitError.value = null;
  try {
    const fd = new FormData();
    fd.append('file', file.value);

    await $fetch(`/api/upload/${token.value}`, { method: 'POST', body: fd });
    uploaded.value = true;
    await refresh();
  } catch (err: any) {
    submitError.value = err?.data?.message ?? 'Upload failed. Please try again.';
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <section class="cms-container max-w-xl py-16 sm:py-24 space-y-8">
    <div class="text-center space-y-3">
      <p class="kicker text-coral-600!">Vaccination record</p>
      <h1 class="font-display-soft text-4xl text-barkside-900">Upload for your appointment</h1>
    </div>

    <!-- Error from initial fetch -->
    <AppCard v-if="error">
      <p class="text-error">Could not load this upload link.</p>
    </AppCard>

    <!-- Already uploaded -->
    <AppCard v-else-if="uploaded || data?.state === 'used'">
      <div class="flex items-start gap-3">
        <UIcon
          name="i-lucide-check-circle-2"
          class="h-5 w-5 text-success mt-0.5" />
        <div>
          <p class="font-medium">Thanks — we have your record.</p>
          <p class="text-sm text-muted mt-1">
            Our team will review the document. You don't need to do anything else.
          </p>
        </div>
      </div>
    </AppCard>

    <!-- Expired -->
    <AppCard v-else-if="data?.state === 'expired'">
      <div class="flex items-start gap-3">
        <UIcon
          name="i-lucide-clock-alert"
          class="h-5 w-5 text-warning mt-0.5" />
        <div>
          <p class="font-medium">This upload link has expired.</p>
          <p class="text-sm text-muted mt-1">
            Please contact us to upload your vaccination record another way.
          </p>
        </div>
      </div>
    </AppCard>

    <!-- Available -->
    <AppCard v-else-if="data?.state === 'available'">
      <div class="mb-4">
        <p class="font-medium">{{ data.petName }}</p>
        <p
          v-if="data.scheduledDate"
          class="text-sm text-muted">
          Appointment on
          <span class="font-medium">{{ formatDate(data.scheduledDate, 'long') }}</span>
          <span v-if="data.startTime">
            at <span class="font-medium">{{ formatClockTime(data.startTime) }}</span>
          </span>
        </p>
      </div>

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
    </AppCard>
  </section>
</template>
