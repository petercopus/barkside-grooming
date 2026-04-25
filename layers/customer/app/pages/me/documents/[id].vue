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
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      :title="doc.fileName"
      back-to="/me/documents" />

    <AppSection>
      <div class="space-y-4">
        <!-- Status + type -->
        <div class="flex gap-2">
          <UBadge variant="subtle">{{ formatDocType(doc.type) }}</UBadge>
          <UBadge
            variant="subtle"
            :color="docStatusColor[doc.status] ?? 'neutral'">
            {{ doc.status }}
          </UBadge>
        </div>

        <!-- Metadata -->
        <dl class="text-sm space-y-1">
          <div class="flex gap-2">
            <dt class="text-muted">Uploaded:</dt>
            <dd>{{ new Date(doc.createdAt).toLocaleDateString() }}</dd>
          </div>
          <div
            v-if="doc.notes"
            class="flex gap-2">
            <dt class="text-muted">Notes:</dt>
            <dd>{{ doc.notes }}</dd>
          </div>
        </dl>

        <!-- Image preview -->
        <div
          v-if="isImage"
          class="rounded-lg border overflow-hidden">
          <img
            :src="doc.url"
            :alt="doc.fileName"
            class="max-w-full max-h-96 object-contain mx-auto" />
        </div>

        <!-- Download -->
        <UButton
          :href="doc.url"
          target="_blank"
          download
          icon="i-lucide-download"
          label="Download" />
      </div>
    </AppSection>
  </div>
</template>
