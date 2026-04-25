<script setup lang="ts">
import { hours, site } from '~/data/site';

defineProps<{
  showForm?: boolean;
}>();

const addressLines = computed(() => {
  return [
    site.street_address,
    [site.address_locality, site.address_region, site.postal_code].filter(Boolean).join(', '),
    site.address_country,
  ].filter(Boolean);
});

type ContactCard =
  | {
      type: 'address';
      iconRing: string;
      icon: string;
      kicker: string;
      title: string;
      delay: string;
      lines: string[];
      mapsHref: string;
    }
  | {
      type: 'link';
      iconRing: string;
      icon: string;
      kicker: string;
      title: string;
      delay: string;
      label: string;
      href: string;
    };

const contactCards = computed<ContactCard[]>(() => [
  {
    type: 'address',
    iconRing: 'bg-coral-500/12 text-coral-600 ring-1 ring-coral-300/40',
    icon: 'i-lucide-map-pin',
    kicker: 'Come by',
    title: 'The salon',
    delay: 'delay-1',
    lines: addressLines.value,
    mapsHref: `https://maps.google.com/?q=${encodeURIComponent(addressLines.value.join(', '))}`,
  },
  {
    type: 'link',
    iconRing: 'bg-moss-500/15 text-moss-700 ring-1 ring-moss-300/40',
    icon: 'i-lucide-phone',
    kicker: 'Ring us',
    title: 'Chat to a human',
    delay: 'delay-2',
    label: site.phone,
    href: `tel:${site.phone}`,
  },
  {
    type: 'link',
    iconRing: 'bg-coral-500/15 text-coral-700 ring-1 ring-coral-300/40',
    icon: 'i-lucide-mail',
    kicker: 'Write us',
    title: 'Drop a line',
    delay: 'delay-3',
    label: site.email,
    href: `mailto:${site.email}`,
  },
]);
</script>

<template>
  <section class="relative cms-container sm:px-6">
    <div class="grid gap-10 lg:grid-cols-2 lg:gap-12">
      <div
        v-if="showForm !== false"
        class="lg:sticky lg:self-start">
        <BlocksContactFormCard />
      </div>

      <div>
        <div class="grid gap-6 grid-cols-1 sm:grid-cols-2">
          <article
            v-for="card in contactCards"
            :key="card.title"
            class="group cms-card transition-transform duration-500 hover:-translate-y-1 reveal-subtle"
            :class="card.delay">
            <span
              class="cms-icon-circle"
              :class="card.iconRing">
              <UIcon
                :name="card.icon"
                class="h-5 w-5" />
            </span>
            <p class="kicker mt-5">{{ card.kicker }}</p>
            <h3 class="font-display-sub mt-1 text-2xl text-barkside-900">{{ card.title }}</h3>

            <template v-if="card.type === 'address'">
              <address
                class="mt-2 flex-1 text-[0.95rem] not-italic leading-relaxed text-barkside-700">
                <span
                  v-for="(line, i) in card.lines"
                  :key="i"
                  class="block">
                  {{ line }}
                </span>
              </address>
              <a
                :href="card.mapsHref"
                target="_blank"
                rel="noopener"
                class="link-editorial mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-coral-600">
                Open in Maps
                <UIcon
                  name="i-lucide-arrow-up-right"
                  class="h-3.5 w-3.5" />
              </a>
            </template>

            <a
              v-else
              :href="card.href"
              class="font-display mt-2 flex-1 break-all text-lg text-barkside-900 hover:text-coral-600">
              {{ card.label }}
            </a>
          </article>

          <!-- Hours -->
          <article
            class="relative flex flex-col rounded-card bg-barkside-950 p-6 text-bone-100 shadow-[0_18px_40px_-20px_rgba(15,30,43,0.55)] sm:p-8 delay-4 reveal-subtle">
            <div
              class="pointer-events-none absolute inset-x-0 top-0 h-3 -translate-y-px torn-top bg-bone-50" />
            <span class="cms-icon-circle bg-coral-500/20 text-coral-300 ring-1 ring-coral-300/30">
              <UIcon
                name="i-lucide-clock"
                class="h-5 w-5" />
            </span>
            <p class="kicker text-coral-300! mt-5">Walk-in window</p>
            <h3 class="font-display-soft mt-1 text-2xl text-bone-50">Salon hours</h3>
            <ul class="mt-3 flex-1 divide-y divide-bone-100/10">
              <li
                v-for="h in hours"
                :key="h.day"
                class="flex items-baseline justify-between gap-3 py-2">
                <span class="text-sm text-bone-100/85">{{ h.day }}</span>
                <span
                  class="flex-1 mx-2 border-b border-dotted border-bone-100/25 translate-y-0.75" />
                <span class="font-display text-sm text-bone-50">{{ h.time }}</span>
              </li>
            </ul>
          </article>
        </div>

        <!-- Social row -->
        <div class="mt-8 flex flex-wrap items-center gap-3 delay-5 reveal-subtle">
          <span class="font-hand text-lg text-coral-600">find us on</span>
          <div class="flex flex-wrap gap-2">
            <a
              v-for="link in site.social_links"
              :key="link.service"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-bone-300 bg-bone-50 text-barkside-800 transition-all duration-200 hover:-translate-y-px hover:border-coral-400 hover:bg-coral-500/10 hover:text-coral-600">
              <UIcon
                :name="socialIcon(link.service)"
                class="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
