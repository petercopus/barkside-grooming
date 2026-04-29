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
  <div class="cms-container py-10 sm:py-14">
    <AppPageIntro
      kicker="Your account"
      title="My documents"
      description="Vaccination records, intake forms, and any paperwork we've shared.">
      <template #actions>
        <UButton
          to="/me/documents/upload"
          icon="i-lucide-upload"
          size="lg">
          Upload document
        </UButton>
      </template>
    </AppPageIntro>

    <div class="mt-10 space-y-8">
      <!-- Pending requests -->
      <section v-if="reqData?.requests?.length">
        <div class="mb-3 flex items-end justify-between">
          <div>
            <p class="kicker">Action needed</p>

            <h2 class="font-display-soft text-2xl text-barkside-900 leading-tight mt-1">
              Pending requests
            </h2>
          </div>
        </div>

        <div class="space-y-3">
          <article
            v-for="req in reqData.requests"
            :key="req.id"
            class="rounded-2xl border border-coral-200/70 bg-coral-50/40 px-5 py-4 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div class="flex items-start gap-3 min-w-0">
                <span
                  class="inline-flex size-10 items-center justify-center rounded-xl bg-coral-100 text-coral-700 shrink-0">
                  <UIcon
                    :name="docTypeIcon(req.documentType)"
                    class="size-5" />
                </span>

                <div class="min-w-0">
                  <p class="font-semibold text-barkside-900">
                    {{ formatDocType(req.documentType) }}
                  </p>

                  <p
                    v-if="req.message"
                    class="text-sm text-barkside-700 mt-0.5">
                    {{ req.message }}
                  </p>

                  <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted mt-1.5">
                    <span
                      v-if="req.petName"
                      class="inline-flex items-center gap-1">
                      <UIcon
                        name="i-lucide-paw-print"
                        class="size-3" />
                      {{ req.petName }}
                    </span>

                    <span
                      v-if="req.dueDate"
                      class="inline-flex items-center gap-1">
                      <UIcon
                        name="i-lucide-calendar"
                        class="size-3" />
                      Due {{ formatDate(req.dueDate, 'short') }}
                    </span>

                    <span class="inline-flex items-center gap-1">
                      <UIcon
                        name="i-lucide-user"
                        class="size-3" />
                      {{ req.requestedByFirstName }} {{ req.requestedByLastName }}
                    </span>
                  </div>
                </div>
              </div>

              <UButton
                :to="uploadUrl(req)"
                icon="i-lucide-upload"
                size="sm"
                label="Upload" />
            </div>
          </article>
        </div>
      </section>

      <!-- Documents -->
      <section>
        <div
          v-if="docData?.documents?.length"
          class="mb-3 flex items-end justify-between">
          <div>
            <p class="kicker">On file</p>

            <h2 class="font-display-soft text-2xl text-barkside-900 leading-tight mt-1">
              Your library
            </h2>
          </div>

          <p class="text-sm text-muted">
            {{ docData.documents.length }}
            {{ docData.documents.length === 1 ? 'document' : 'documents' }}
          </p>
        </div>

        <AppEmptyState
          v-if="!docData?.documents?.length"
          icon="i-lucide-file-text"
          title="No documents yet"
          description="Upload vaccination records, photos, or anything else you'd like us to keep on file."
          action-label="Upload document"
          action-icon="i-lucide-upload"
          @action="navigateTo('/me/documents/upload')" />

        <div
          v-else
          class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <NuxtLink
            v-for="(doc, idx) in docData.documents"
            :key="doc.id"
            :to="`/me/documents/${doc.id}`"
            :style="{ animationDelay: `${Math.min(idx * 50, 300)}ms` }"
            class="reveal-subtle group flex flex-col rounded-2xl border border-default/70 bg-white/70 p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
            <header class="flex items-start gap-3">
              <span
                class="inline-flex size-11 items-center justify-center rounded-2xl bg-primary-100/70 text-primary-600 shrink-0 shadow-sm">
                <UIcon
                  :name="docTypeIcon(doc.type)"
                  class="size-5" />
              </span>

              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">
                  {{ formatDocType(doc.type) }}
                </p>

                <p class="text-base font-medium text-default truncate mt-0.5">
                  {{ doc.fileName }}
                </p>
              </div>
            </header>

            <div
              class="mt-4 flex items-center justify-between border-t border-default/60 pt-3 text-sm">
              <span class="inline-flex items-center gap-1.5 text-muted">
                <UIcon
                  name="i-lucide-calendar"
                  class="size-3.5" />
                {{ formatDate(doc.createdAt, 'short') }}
              </span>

              <UBadge
                variant="subtle"
                :color="docStatusColor[doc.status] ?? 'neutral'"
                size="sm"
                :label="docStatusLabel[doc.status] ?? doc.status" />
            </div>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>
