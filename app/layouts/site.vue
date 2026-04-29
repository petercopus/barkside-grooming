<script setup lang="ts">
import { footerNav, mainNav } from '~/data/navigation';
import { site } from '~/data/site';

const { user, isLoggedIn, logout } = useAuth();

const menuOpen = ref(false);
const userFullName = computed(() => formatFullName(user.value?.firstName, user.value?.lastName));

const accountItems = [
  [
    { label: 'My Pets', icon: 'i-lucide-paw-print', to: '/me/pets' },
    { label: 'Appointments', icon: 'i-lucide-calendar', to: '/me/appointments' },
    { label: 'Documents', icon: 'i-lucide-file-text', to: '/me/documents' },
    { label: 'Settings', icon: 'i-lucide-settings', to: '/me/settings' },
  ],
  [{ label: 'Logout', icon: 'i-lucide-log-out', onSelect: () => logout() }],
];

const scrolled = ref(false);

const onScroll = () => {
  const next = window.scrollY > 8;
  if (next !== scrolled.value) scrolled.value = next;
};

onMounted(() => {
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
});

const address = computed(() => {
  const parts = [
    site.street_address,
    [site.address_locality, site.address_region].filter(Boolean).join(', '),
    site.postal_code,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
});

const route = useRoute();
const isActive = (to: string) => route.path === to || (to !== '/' && route.path.startsWith(to));
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-bone-50">
    <!-- Header -->
    <header
      class="sticky top-0 z-40 border-b transition-colors duration-300"
      :class="
        scrolled
          ? 'bg-bone-50/92 backdrop-blur-md border-bone-300/70 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]'
          : 'bg-transparent border-transparent'
      ">
      <div class="cms-container flex items-center justify-between py-4 sm:px-6">
        <AppLogo />

        <nav class="hidden items-center gap-8 md:flex">
          <ULink
            v-for="item in mainNav"
            :key="item.label"
            :to="item.to"
            class="group relative font-display text-[0.95rem] font-medium transition-colors"
            :class="isActive(item.to) ? 'text-coral-600' : 'text-barkside-800 hover:text-coral-600'"
            style="
              font-variation-settings:
                'opsz' 36,
                'SOFT' 80;
            ">
            {{ item.label }}

            <span
              class="pointer-events-none absolute inset-x-0 -bottom-1.5 h-[1.5px] origin-left bg-coral-500 transition-transform duration-400"
              :class="
                isActive(item.to)
                  ? 'scale-x-100'
                  : 'scale-x-0 group-hover:scale-x-100 group-hover:origin-[left]'
              " />
          </ULink>
        </nav>

        <div class="flex items-center gap-2">
          <AppNotificationBell v-if="isLoggedIn" />

          <NuxtLink
            to="/book"
            class="group relative hidden items-center gap-1.5 rounded-full bg-barkside-900 px-5 py-2.5 text-sm font-medium text-bone-50 shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_4px_14px_rgba(15,30,43,0.2)] transition-transform duration-200 hover:-translate-y-px hover:bg-barkside-800 sm:inline-flex">
            <span>Book now</span>

            <UIcon
              name="i-lucide-arrow-up-right"
              class="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </NuxtLink>

          <template v-if="isLoggedIn">
            <UDropdownMenu
              :items="accountItems"
              :content="{ align: 'end', collisionPadding: 12 }"
              class="hidden sm:block">
              <UButton
                variant="ghost"
                color="neutral">
                <template #default>
                  <UAvatar
                    v-if="user?.firstName"
                    :alt="userFullName" />
                  <span v-else>Account</span>
                </template>
              </UButton>
            </UDropdownMenu>
          </template>

          <template v-else>
            <UButton
              to="/login"
              variant="ghost"
              color="neutral"
              label="Sign In"
              class="hidden sm:inline-flex" />
          </template>

          <UButton
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-bone-300 text-barkside-900 transition-colors md:hidden"
            variant="ghost"
            color="secondary"
            @click="menuOpen = !menuOpen">
            <UIcon
              :name="menuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
              class="h-5 w-5" />
          </UButton>
        </div>
      </div>

      <!-- Mobile drawer -->
      <div
        v-if="menuOpen"
        class="border-t border-bone-300 bg-bone-50 md:hidden">
        <nav class="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
          <NuxtLink
            v-for="item in mainNav"
            :key="item.label"
            :to="item.to"
            class="font-display text-lg text-barkside-900 hover:text-coral-600"
            @click="menuOpen = false">
            {{ item.label }}
          </NuxtLink>

          <template v-if="isLoggedIn">
            <hr class="my-2 border-bone-300" />

            <NuxtLink
              to="/me/pets"
              class="font-display text-lg text-barkside-900 hover:text-coral-600"
              @click="menuOpen = false">
              My Pets
            </NuxtLink>

            <NuxtLink
              to="/me/appointments"
              class="font-display text-lg text-barkside-900 hover:text-coral-600"
              @click="menuOpen = false">
              Appointments
            </NuxtLink>

            <NuxtLink
              to="/me/documents"
              class="font-display text-lg text-barkside-900 hover:text-coral-600"
              @click="menuOpen = false">
              Documents
            </NuxtLink>

            <NuxtLink
              to="/me/settings"
              class="font-display text-lg text-barkside-900 hover:text-coral-600"
              @click="menuOpen = false">
              Settings
            </NuxtLink>

            <div class="mt-2">
              <UButton
                variant="solid"
                color="neutral"
                size="xl"
                block
                label="Logout"
                icon="i-lucide-log-out"
                @click="
                  logout();
                  menuOpen = false;
                " />
            </div>
          </template>

          <div
            v-else
            class="mt-2">
            <UButton
              to="/login"
              variant="solid"
              color="neutral"
              size="xl"
              block
              label="Sign In" />
          </div>
        </nav>
      </div>
    </header>

    <main class="relative flex-1">
      <UPage>
        <slot />
      </UPage>
    </main>

    <!-- Footer -->
    <footer class="relative mt-24 bg-barkside-950 text-bone-100">
      <div
        class="torn-top absolute inset-x-0 top-0 h-4 -translate-y-px bg-bone-50"
        aria-hidden="true" />

      <div class="pointer-events-none absolute inset-x-0 top-14 overflow-hidden opacity-[0.06]">
        <p
          class="font-display-soft select-none whitespace-nowrap text-center text-[22vw] leading-[0.85] text-bone-100">
          Barkside
        </p>
      </div>

      <div class="relative cms-container pt-20 pb-10 sm:px-6">
        <div class="grid items-end gap-10 border-b border-bone-100/15 pb-12 md:grid-cols-12">
          <div class="md:col-span-8">
            <p class="kicker text-coral-300!">Paws · Play · Pamper</p>

            <h3 class="font-display-soft mt-3 text-4xl leading-[1.05] text-bone-50 sm:text-6xl">
              {{ site.tagline }}
            </h3>
          </div>
          <div class="flex md:col-span-4 md:justify-end">
            <UButton
              to="/book"
              variant="editorial"
              color="secondary">
              Book a groom
              <template #trailing>
                <AppCtaArrow variant="light" />
              </template>
            </UButton>
          </div>
        </div>

        <div class="grid gap-10 pt-12 md:grid-cols-12">
          <div class="md:col-span-4">
            <AppLogo variant="dark" />

            <p class="mt-4 max-w-xs text-sm leading-relaxed text-bone-100/70">
              Small-batch grooming for dogs who deserve better than a production line. Salt-air
              calm, salon-standard finish.
            </p>
          </div>

          <div class="md:col-span-3">
            <h4 class="kicker text-bone-100/60!">Explore</h4>

            <ul class="mt-4 space-y-2.5">
              <li
                v-for="item in footerNav"
                :key="item.label">
                <NuxtLink
                  :to="item.to"
                  class="group inline-flex items-center gap-2 text-[0.95rem] text-bone-100/85 transition-colors hover:text-coral-300">
                  <span
                    class="inline-block h-px w-3 bg-bone-100/40 transition-all duration-300 group-hover:w-6 group-hover:bg-coral-300" />
                  {{ item.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>

          <div class="md:col-span-3">
            <h4 class="kicker text-bone-100/60!">Salon</h4>
            <ul class="mt-4 space-y-2.5 text-[0.95rem] text-bone-100/85">
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-mail"
                  class="mt-1 h-4 w-4 text-coral-300" />

                <a
                  :href="`mailto:${site.email}`"
                  class="hover:text-coral-300">
                  {{ site.email }}
                </a>
              </li>

              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-phone"
                  class="mt-1 h-4 w-4 text-coral-300" />

                <a
                  :href="`tel:${site.phone}`"
                  class="hover:text-coral-300">
                  {{ site.phone }}
                </a>
              </li>

              <li
                v-if="address"
                class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-map-pin"
                  class="mt-1 h-4 w-4 text-coral-300" />
                <span>{{ address }}</span>
              </li>
            </ul>
          </div>

          <div class="md:col-span-2">
            <h4 class="kicker text-bone-100/60!">Follow</h4>

            <div class="mt-4 flex flex-wrap gap-2">
              <a
                v-for="link in site.social_links"
                :key="link.service"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-bone-100/20 text-bone-100/80 transition-all duration-200 hover:-translate-y-px hover:border-coral-300 hover:bg-coral-500/10 hover:text-coral-300">
                <UIcon
                  :name="socialIcon(link.service)"
                  class="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div
          class="mt-14 flex flex-col items-start justify-between gap-2 border-t border-bone-100/15 pt-6 text-xs text-bone-100/55 sm:flex-row sm:items-center">
          <span>
            {{ `© ${new Date().getFullYear()} ${site.title}. All rights reserved.` }}
          </span>

          <span class="font-hand text-lg text-coral-300/80">Made with wet-nose kisses.</span>
        </div>
      </div>
    </footer>

    <AppNotificationDrawer />
  </div>
</template>
