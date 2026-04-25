export default defineAppConfig({
  ui: {
    colors: {
      primary: 'barkside',
      secondary: 'coral',
      success: 'emerald',
      info: 'sky',
      warning: 'orange',
      error: 'red',
      neutral: 'mauve',
    },
    badge: {
      defaultVariants: {
        size: 'md',
        variant: 'subtle',
      },
    },
    button: {
      variants: {
        variant: {
          editorial: '',
        },
      },
      compoundVariants: [
        {
          variant: 'editorial',
          class:
            'group inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-base font-medium transition-all duration-200 hover:-translate-y-0.5',
        },
        {
          variant: 'editorial',
          color: 'secondary',
          class:
            'bg-coral-500 text-bone-50 shadow-[0_10px_30px_-8px_rgba(205,103,72,0.5)] hover:bg-coral-400',
        },
        {
          variant: 'editorial',
          color: 'primary',
          class:
            'bg-barkside-900 text-bone-50 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] hover:bg-barkside-800',
        },
        {
          variant: 'editorial',
          color: 'neutral',
          class:
            'border border-barkside-900/20 bg-bone-50 text-barkside-900 hover:border-coral-500 hover:bg-coral-50',
        },
      ],
      defaultVariants: {
        size: 'md',
      },
    },
    checkbox: {
      defaultVariants: {
        size: 'lg',
      },
      slots: {
        root: 'cursor-pointer hover:bg-muted/50',
      },
      variants: {
        variant: {
          listcard: {
            root: 'rounded-lg p-2',
          },
        },
      },
    },
    input: {
      slots: {
        root: 'w-full',
      },
      variants: {
        size: {
          lg: {
            base: 'px-3 py-3 text-base/5 gap-2',
          },
        },
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
    modal: {
      slots: {
        footer: 'justify-end',
      },
    },
    select: {
      slots: {
        base: 'w-full',
        trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
        content: 'min-w-fit',
      },
      defaultVariants: {
        size: 'lg',
      },
    },
    selectMenu: {
      slots: {
        trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
      },
      defaultVariants: {
        size: 'lg',
      },
    },
    card: {
      slots: {
        root: '',
        header: 'p-4 sm:p-4',
        body: 'p-4 sm:p-4',
        footer: 'p-4 sm:p-4',
      },
      variants: {
        variant: {
          outline: {
            root: 'bg-white shadow-xs divide-y-0',
          },
        },
      },
    },
    table: {
      slots: {
        td: 'py-3.5',
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
