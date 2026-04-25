<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui';
import type { FormField } from '~/data/contact-form';
import { contactForm } from '~/data/contact-form';

const fields = contactForm.schema;

const values = reactive<Record<string, any>>({});
const submitting = ref(false);
const submitted = ref(false);
const serverError = ref<string | null>(null);

const textareaLined = {
  backgroundImage:
    'repeating-linear-gradient(to bottom, transparent 0 28px, color-mix(in oklab, var(--color-bone-400) 40%, transparent) 28px 29px)',
  lineHeight: '20px',
};

function labelFor(field: FormField): string {
  return field.label || field.name;
}

function validate(): FormError[] {
  const errs: FormError[] = [];
  for (const field of fields) {
    const raw = values[field.name];
    const val = typeof raw === 'string' ? raw.trim() : raw;

    if (field.required && (val === undefined || val === null || val === '' || val === false)) {
      errs.push({ name: field.name, message: `${labelFor(field)} is required` });
      continue;
    }
    if (
      field.type === 'email' &&
      typeof val === 'string' &&
      val &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
    ) {
      errs.push({ name: field.name, message: "Doesn't look quite right" });
    }
  }
  return errs;
}

async function onSubmit(event: FormSubmitEvent<Record<string, any>>) {
  serverError.value = null;
  submitting.value = true;
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: { formKey: contactForm.key, values: { ...event.data } },
    });
    submitted.value = true;
  } catch (e: any) {
    serverError.value = e.data?.message || 'Something went wrong on our end. Try again?';
  } finally {
    submitting.value = false;
  }
}

function reset() {
  submitted.value = false;
  for (const k of Object.keys(values)) delete values[k];
}

const successHeading = computed(() => {
  const first =
    typeof values.first_name === 'string' && values.first_name.trim()
      ? (values.first_name.trim().split(' ')[0] ?? 'friend')
      : 'friend';
  return contactForm.success_message.includes('{first_name}')
    ? contactForm.success_message.replace('{first_name}', first)
    : contactForm.success_message;
});
</script>

<template>
  <div
    class="relative cms-card bg-bone-50 p-8 shadow-[0_30px_60px_-30px_rgba(15,30,43,0.4)] ring-1 ring-bone-300/70 sm:p-10 delay-1 reveal">
    <!-- Perforated spine -->
    <div
      class="pointer-events-none absolute inset-y-6 left-3 hidden w-px sm:block"
      style="
        background-image: linear-gradient(
          to bottom,
          var(--color-bone-400) 0 4px,
          transparent 4px 10px
        );
        background-size: 1px 10px;
        background-repeat: repeat-y;
      " />

    <!-- Corner tape -->
    <span
      class="pointer-events-none absolute -top-3 right-16 h-6 w-24 rounded-sm bg-coral-200/80 shadow-[0_1px_2px_rgba(15,30,43,0.15)]"
      style="transform: rotate(4deg)"
      aria-hidden="true" />

    <Transition
      mode="out-in"
      enter-active-class="transition-all duration-500 ease-out"
      leave-active-class="transition-all duration-300 ease-in"
      enter-from-class="opacity-0 translate-y-3"
      leave-to-class="opacity-0 -translate-y-3">
      <UForm
        v-if="!submitted"
        key="form"
        :state="values"
        :validate="validate"
        class="relative space-y-5"
        @submit="onSubmit">
        <header class="flex items-end justify-between gap-4 border-b border-bone-300/70 pb-5">
          <div>
            <p class="kicker">Get in touch</p>
            <h2 class="font-display-soft mt-1 text-3xl text-barkside-900 sm:text-4xl">
              {{ contactForm.title }}
            </h2>
          </div>
          <span class="font-hand hidden text-lg text-coral-600 sm:inline"> no wrong answers </span>
        </header>

        <template
          v-for="field in fields"
          :key="field.name">
          <UFormField
            v-if="field.type === 'checkbox'"
            :name="field.name">
            <UCheckbox
              v-model="values[field.name]"
              :label="labelFor(field)"
              :description="field.help" />
          </UFormField>

          <UFormField
            v-else-if="field.type === 'select'"
            :name="field.name"
            :label="labelFor(field)">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="opt in field.options ?? []"
                :key="opt.value"
                type="button"
                class="rounded-full border px-4 py-1.5 text-sm transition-all duration-200 hover:-translate-y-px"
                :class="
                  values[field.name] === opt.value
                    ? 'border-coral-500 bg-coral-500 text-bone-50 shadow-[0_4px_14px_-6px_rgba(205,103,72,0.6)]'
                    : 'border-bone-300 bg-bone-50 text-barkside-800 hover:border-coral-400 hover:text-coral-700'
                "
                @click="values[field.name] = values[field.name] === opt.value ? '' : opt.value">
                {{ opt.label }}
              </button>
            </div>
          </UFormField>

          <UFormField
            v-else-if="field.type === 'textarea'"
            :name="field.name"
            :label="labelFor(field)">
            <UTextarea
              v-model="values[field.name]"
              :rows="8"
              :placeholder="field.placeholder"
              :style="textareaLined"
              class="rounded-full" />
          </UFormField>

          <UFormField
            v-else
            :name="field.name"
            :label="labelFor(field)">
            <UInput
              v-model="values[field.name]"
              :type="field.type"
              :placeholder="field.placeholder"
              class="rounded-full" />
          </UFormField>
        </template>

        <p
          v-if="serverError"
          class="font-hand text-coral-700">
          {{ serverError }}
        </p>

        <div class="flex justify-center sm:justify-end pt-2">
          <UButton
            type="submit"
            :loading="submitting"
            size="xl"
            trailing-icon="i-lucide-send-horizontal"
            class="rounded-full">
            {{ contactForm.submit_label }}
          </UButton>
        </div>
      </UForm>

      <div
        v-else
        key="done"
        class="relative py-6 text-center">
        <div
          class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-moss-500/15 ring-1 ring-moss-500/30">
          <UIcon
            name="i-lucide-check"
            class="h-10 w-10 text-moss-700" />
        </div>
        <p class="kicker mt-6">Note sent</p>
        <h2 class="font-display-soft mt-3 text-4xl text-barkside-900 sm:text-5xl">
          {{ successHeading }}
        </h2>
        <p class="mx-auto mt-4 max-w-md text-barkside-700">
          {{ contactForm.success_message }}
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <UButton
            variant="outline"
            color="neutral"
            class="rounded-full"
            @click="reset">
            Send another
          </UButton>
          <UButton
            to="/book"
            trailing-icon="i-lucide-arrow-right"
            class="rounded-full">
            Book a groom
          </UButton>
        </div>
      </div>
    </Transition>
  </div>
</template>
