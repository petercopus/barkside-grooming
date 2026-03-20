interface UseFormActionOptions {
  successMessage?: string;
  redirectTo?: string | ((result: unknown) => string);
  onSuccess?: (result: unknown) => void | Promise<void>;
}

export function useFormAction(options: UseFormActionOptions = {}) {
  const toast = useToast();
  const error = ref<string | null>(null);
  const loading = ref(false);

  async function execute(fn: () => Promise<any>) {
    error.value = null;
    loading.value = true;

    try {
      const result = await fn();

      if (options.onSuccess) await options.onSuccess(result);
      if (options.successMessage) toast.add({ title: options.successMessage, color: 'success' });

      if (options.redirectTo) {
        const target =
          typeof options.redirectTo === 'function'
            ? options.redirectTo(result)
            : options.redirectTo;

        await navigateTo(target as string);
      }
    } catch (e: any) {
      error.value = e.data?.message ?? e.message ?? 'Something went wrong';
    } finally {
      loading.value = false;
    }
  }

  return { error, loading, execute };
}
