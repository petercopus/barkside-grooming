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
