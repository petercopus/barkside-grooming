export default defineAppConfig({
  ui: {
    input: {
      slots: {
        root: 'w-full',
      },
      defaultVariants: {
        size: 'lg',
      },
    },

    inputNumber: {
      slots: {
        root: 'w-full',
      },
      defaultVariants: {
        size: 'lg',
      },
    },

    select: {
      slots: {
        base: 'w-full',
      },
      defaultVariants: {
        size: 'lg',
      },
    },

    textarea: {
      slots: {
        root: 'w-full',
      },
      defaultVariants: {
        size: 'lg',
      },
    },
  },
});
