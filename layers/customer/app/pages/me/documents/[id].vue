<script setup lang="ts">
definePageMeta({
  layout: 'site',
  middleware: 'auth',
});

const route = useRoute();
const docId = route.params.id as string;

const { data } = await useFetch(`/api/documents/${docId}`);

if (!data.value?.document) {
  throw createError({ statusCode: 404, message: 'Document not found' });
}

const doc = data.value.document;

const isImage = computed(() => ['image/jpeg', 'image/png'].includes(doc.mimeType ?? ''));
const isPdf = computed(() => doc.mimeType === 'application/pdf');

function docTypeIcon(type: string): string {
  const t = type?.toLowerCase() ?? '';

  if (t.includes('vaccin') || t.includes('rabies')) return 'i-lucide-syringe';
  if (t.includes('id')) return 'i-lucide-id-card';
  if (t.includes('medical') || t.includes('health')) return 'i-lucide-heart-pulse';
  if (t.includes('photo') || t.includes('image')) return 'i-lucide-image';

  return 'i-lucide-file-text';
}
</script>

<template>
  <div class="cms-container py-10 sm:py-14 max-w-4xl">
    <AppPageIntro
      kicker="Document"
      :title="doc.fileName"
      back-to="/me/documents" />

    <div class="mt-8 space-y-6">
      <AppSectionPanel
        kicker="Details"
        title="Overview"
        :icon="docTypeIcon(doc.type)">
        <template #actions>
          <UBadge
            variant="subtle"
            :color="docStatusColor[doc.status] ?? 'neutral'"
            :label="docStatusLabel[doc.status] ?? doc.status" />
        </template>

        <dl class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt class="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Type</dt>
            <dd class="text-default font-medium mt-1">{{ formatDocType(doc.type) }}</dd>
          </div>

          <div>
            <dt class="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Uploaded
            </dt>
            <dd class="text-default font-medium mt-1">
              {{ formatTimestamp(doc.createdAt) }}
            </dd>
          </div>

          <div>
            <dt class="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Status</dt>
            <dd class="text-default font-medium mt-1 capitalize">{{ doc.status }}</dd>
          </div>
        </dl>

        <div
          v-if="doc.notes"
          class="mt-5 rounded-xl bg-bone-100/60 border border-bone-200/60 px-4 py-3 text-sm text-barkside-800 italic">
          <UIcon
            name="i-lucide-quote"
            class="size-3.5 text-coral-500 inline-block mr-1 -mt-0.5" />
          {{ doc.notes }}
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <UButton
            :href="doc.url"
            target="_blank"
            download
            icon="i-lucide-download"
            size="lg"
            label="Download" />
          <UButton
            v-if="!isImage && !isPdf"
            :href="doc.url"
            target="_blank"
            variant="ghost"
            icon="i-lucide-external-link"
            size="lg"
            label="Open in new tab" />
        </div>
      </AppSectionPanel>

      <AppSectionPanel
        v-if="isImage || isPdf"
        kicker="Preview"
        title="Document preview"
        icon="i-lucide-eye"
        tone="plain">
        <div
          v-if="isImage"
          class="rounded-xl border border-default/70 bg-white overflow-hidden">
          <img
            :src="doc.url"
            :alt="doc.fileName"
            class="max-w-full max-h-150 object-contain mx-auto" />
        </div>

        <div
          v-else-if="isPdf"
          class="rounded-xl border border-default/70 bg-white overflow-hidden">
          <iframe
            :src="doc.url"
            :title="doc.fileName"
            class="w-full h-150" />
        </div>
      </AppSectionPanel>
    </div>
  </div>
</template>
