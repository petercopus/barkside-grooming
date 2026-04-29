export function useDebouncedRef<T>(source: Ref<T>, delayMs = 300) {
  const debounced = ref(source.value) as Ref<T>;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  watch(source, (value) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      debounced.value = value;
    }, delayMs);
  });

  onBeforeUnmount(() => {
    if (timeout) clearTimeout(timeout);
  });

  return debounced;
}
