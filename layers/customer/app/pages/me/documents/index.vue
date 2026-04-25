<script setup lang="ts">
definePageMeta({
  layout: 'site',
  middleware: 'auth',
});

const [{ data: docData }, { data: reqData }] = await Promise.all([
  useFetch('/api/documents'),
  useFetch('/api/document-requests'),
]);

function uploadUrl(req: { id: string; documentType: string; petId?: string | null }) {
  const params = new URLSearchParams({
    requestId: req.id,
    type: req.documentType,
  });

  if (req.petId) params.set('petId', req.petId);
  return `/me/documents/upload?${params}`;
}
</script>

<template>
  <div>
    <AppPageHeader
      title="My Documents"
      description="View and upload documents">
      <template #actions>
        <UButton
          to="/me/documents/upload"
          icon="i-lucide-upload">
          Upload
        </UButton>
      </template>
    </AppPageHeader>

    <div class="py-4 space-y-6">
      <!-- Pending requests -->
      <div
        v-if="reqData?.requests?.length"
        class="space-y-3">
        <h3 class="text-sm font-medium text-muted">Pending Requests</h3>
        <div
          v-for="req in reqData.requests"
          :key="req.id"
          class="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div class="space-y-1">
            <p class="font-medium">{{ formatDocType(req.documentType) }}</p>
            <p
              v-if="req.message"
              class="text-sm text-muted">
              {{ req.message }}
            </p>
            <div class="flex gap-3 text-sm text-muted">
              <span v-if="req.petName">Pet: {{ req.petName }}</span>
              <span v-if="req.dueDate">Due: {{ req.dueDate }}</span>
              <span>From: {{ req.requestedByFirstName }} {{ req.requestedByLastName }}</span>
            </div>
          </div>
          <UButton
            :to="uploadUrl(req)"
            icon="i-lucide-upload"
            size="sm"
            label="Upload" />
        </div>
      </div>

      <!-- Documents -->
      <AppEmptyState
        v-if="!docData?.documents?.length"
        icon="i-lucide-file-text"
        title="No documents yet"
        variant="section" />

      <div
        v-else
        class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AppCard
          v-for="doc in docData.documents"
          :key="doc.id"
          :title="doc.fileName"
          :to="`/me/documents/${doc.id}`">
          <div class="space-y-2">
            <div class="flex gap-2">
              <UBadge variant="subtle">{{ formatDocType(doc.type) }}</UBadge>
              <UBadge
                variant="subtle"
                :color="docStatusColor[doc.status] ?? 'neutral'">
                {{ doc.status }}
              </UBadge>
            </div>
            <p class="text-sm text-muted">
              {{ new Date(doc.createdAt).toLocaleDateString() }}
            </p>
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>
