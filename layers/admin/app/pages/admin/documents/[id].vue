<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'document:read:all',
});

const route = useRoute();
const id = route.params.id as string;
const toast = useToast();
const confirm = useConfirmDialog();

const { data, refresh } = await useFetch(`/api/admin/documents/${id}`);

if (!data.value?.document) {
  throw createError({ statusCode: 404, message: 'Document not found' });
}

const doc = computed(() => data.value!.document);

const isImage = computed(() => ['image/jpeg', 'image/png'].includes(doc.value.mimeType ?? ''));

const reviewNotes = ref('');
const loading = ref(false);

async function updateStatus(status: 'approved' | 'rejected') {
  loading.value = true;

  try {
    await $fetch(`/api/admin/documents/${id}/status`, {
      method: 'PATCH',
      body: { status, notes: reviewNotes.value || undefined },
    });

    toast.add({ title: `Document ${status}`, color: 'success' });
    reviewNotes.value = '';

    await refresh();
  } catch (e: any) {
    toast.add({ title: e.data?.message ?? 'Failed to update', color: 'error' });
  } finally {
    loading.value = false;
  }
}

async function deleteDocument() {
  const confirmed = await confirm({
    title: 'Delete document',
    description: 'This will permanently delete the document. Are you sure?',
    confirmLabel: 'Delete',
  });

  if (!confirmed) return;

  try {
    await $fetch(`/api/admin/documents/${id}`, { method: 'DELETE' });
    toast.add({ title: 'Document deleted', color: 'success' });
    await navigateTo('/admin/documents');
  } catch (e: any) {
    toast.add({ title: e.data?.message ?? 'Failed to delete', color: 'error' });
  }
}
</script>

<template>
  <AppPage
    :title="doc.fileName"
    back-to="/admin/documents">
    <template #actions>
      <UButton
        color="error"
        variant="ghost"
        icon="i-lucide-trash-2"
        label="Delete"
        size="sm"
        @click="deleteDocument" />
    </template>

    <AppCard title="Details">
      <div class="space-y-4">
        <div class="flex gap-2">
          <UBadge variant="subtle">{{ formatDocType(doc.type) }}</UBadge>
          <AppStatusBadge
            kind="document"
            :value="doc.status" />
        </div>

        <AppFieldGrid>
          <AppField label="Uploaded By">
            <AppCustomerLink
              v-if="doc.uploadedByUserId"
              :id="doc.uploadedByUserId">
              View
            </AppCustomerLink>
            <span v-else>—</span>
          </AppField>
          <AppField
            label="Upload Date"
            :value="formatDate(doc.createdAt)" />
          <AppField
            label="MIME Type"
            :value="doc.mimeType ?? '—'" />
        </AppFieldGrid>

        <div
          v-if="isImage"
          class="rounded-lg border overflow-hidden">
          <img
            :src="doc.url"
            :alt="doc.fileName"
            class="max-w-full max-h-96 object-contain mx-auto" />
        </div>

        <UButton
          :href="doc.url"
          target="_blank"
          download
          icon="i-lucide-download"
          label="Download"
          variant="outline" />
      </div>
    </AppCard>

    <AppCard
      v-if="doc.status === 'pending'"
      title="Review">
      <div class="space-y-4">
        <UFormField label="Notes (optional)">
          <UTextarea v-model="reviewNotes" />
        </UFormField>

        <div class="flex gap-2">
          <UButton
            color="success"
            icon="i-lucide-check"
            label="Approve"
            :loading="loading"
            @click="updateStatus('approved')" />
          <UButton
            color="error"
            variant="outline"
            icon="i-lucide-x"
            label="Reject"
            :loading="loading"
            @click="updateStatus('rejected')" />
        </div>
      </div>
    </AppCard>
  </AppPage>
</template>
