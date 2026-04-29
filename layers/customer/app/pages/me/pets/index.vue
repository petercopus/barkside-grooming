<script setup lang="ts">
definePageMeta({
  layout: 'site',
  middleware: 'auth',
});

const { data, refresh } = await useFetch('/api/pets');
const confirm = useConfirmDialog();

async function deletePet(id: string) {
  const confirmed = await confirm({
    title: 'Remove pet',
    description: 'Are you sure you want to remove this pet?',
    confirmLabel: 'Remove',
  });

  if (!confirmed) return;

  await $fetch(`/api/pets/${id}`, { method: 'DELETE' });
  await refresh();
}

function petAge(dob: string | null | undefined): string | null {
  if (!dob) return null;

  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
  if (years < 1) {
    const months = Math.max(
      0,
      now.getMonth() - birth.getMonth() + 12 * (now.getFullYear() - birth.getFullYear()),
    );

    return `${months} mo`;
  }

  return `${years} yr${years === 1 ? '' : 's'}`;
}
</script>

<template>
  <div class="cms-container py-10 sm:py-14">
    <AppPageIntro
      kicker="Your account"
      title="My pups"
      description="Keep their profiles up to date — size, coat, and quirks help us tailor each visit.">
      <template #actions>
        <UButton
          to="/me/pets/new"
          icon="i-lucide-plus"
          size="lg">
          Add a pup
        </UButton>
      </template>
    </AppPageIntro>

    <div class="mt-10">
      <AppEmptyState
        v-if="!data?.pets?.length"
        icon="i-lucide-paw-print"
        title="No pups on file yet"
        description="Add your first pup so we can welcome them by name on their next groom."
        action-label="Add a pup"
        action-icon="i-lucide-plus"
        @action="navigateTo('/me/pets/new')" />

      <div
        v-else
        class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="(pet, idx) in data.pets"
          :key="pet.id"
          :style="{ animationDelay: `${Math.min(idx * 60, 360)}ms` }"
          class="reveal-subtle group relative flex flex-col rounded-2xl border border-default/70 bg-white/70 p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
          <header class="flex items-start gap-3">
            <span
              class="inline-flex size-11 items-center justify-center rounded-2xl bg-primary-100/70 text-primary-600 shrink-0 shadow-sm">
              <UIcon
                name="i-lucide-paw-print"
                class="size-5" />
            </span>

            <div class="min-w-0 flex-1">
              <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">
                Profile
              </p>

              <h3 class="font-display-soft text-2xl text-barkside-900 leading-tight truncate">
                {{ pet.name }}
              </h3>

              <p
                v-if="pet.breed"
                class="text-sm text-muted truncate">
                {{ pet.breed }}
              </p>
            </div>

            <div class="flex gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
              <UButton
                :to="`/me/pets/${pet.id}/edit`"
                variant="ghost"
                size="sm"
                icon="i-lucide-pencil"
                aria-label="Edit" />
              <UButton
                variant="ghost"
                size="sm"
                color="error"
                icon="i-lucide-trash-2"
                aria-label="Remove"
                @click="deletePet(pet.id)" />
            </div>
          </header>

          <UBadge
            v-if="!pet.sizeCategoryId"
            color="warning"
            variant="subtle"
            size="sm"
            icon="i-lucide-alert-triangle"
            class="mt-3 self-start">
            Size not set
          </UBadge>

          <dl class="mt-4 grid grid-cols-3 gap-2 text-sm border-t border-default/60 pt-4">
            <div class="flex flex-col">
              <dt class="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Weight
              </dt>
              <dd class="text-default font-medium tabular-nums mt-0.5">
                {{ pet.weightLbs ? `${pet.weightLbs} lb` : '—' }}
              </dd>
            </div>

            <div class="flex flex-col">
              <dt class="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Age</dt>
              <dd class="text-default font-medium mt-0.5">
                {{ petAge(pet.dateOfBirth) ?? '—' }}
              </dd>
            </div>

            <div class="flex flex-col">
              <dt class="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Coat</dt>
              <dd class="text-default font-medium mt-0.5 capitalize truncate">
                {{ pet.coatType || '—' }}
              </dd>
            </div>
          </dl>

          <div
            v-if="pet.specialNotes"
            class="mt-4 rounded-xl bg-bone-100/60 border border-bone-200/60 px-3 py-2 text-sm text-barkside-800 italic">
            <UIcon
              name="i-lucide-quote"
              class="size-3.5 text-coral-500 inline-block mr-1 -mt-0.5" />

            <span class="line-clamp-2">{{ pet.specialNotes }}</span>
          </div>
        </article>

        <NuxtLink
          to="/me/pets/new"
          class="reveal-subtle group flex items-center justify-center gap-3 rounded-2xl border border-dashed border-primary-300/70 bg-white/30 px-5 py-8 text-primary-700 transition hover:bg-primary-50/50 hover:border-primary-400 min-h-40">
          <span
            class="inline-flex size-11 items-center justify-center rounded-2xl bg-primary-100/70 text-primary-600 shadow-sm group-hover:scale-105 transition-transform">
            <UIcon
              name="i-lucide-plus"
              class="size-5" />
          </span>

          <div>
            <p class="font-display-soft text-xl text-barkside-900 leading-tight">Add another pup</p>
            <p class="text-sm text-muted mt-0.5">More pets, more wagging tails.</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
