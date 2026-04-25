export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'tel' | 'select' | 'checkbox';
  required: boolean;
  placeholder?: string;
  help?: string;
  options?: { label: string; value: string }[];
}

export const contactForm = {
  key: 'contact-us',
  title: 'Tell us about your pup',
  submit_label: 'Send note',
  success_message: "Thanks — we'll write back within a day. In the meantime, the kettle's on.",
  schema: [
    {
      name: 'first_name',
      label: 'Your name',
      type: 'text' as const,
      required: true,
      placeholder: 'Dog parent extraordinaire',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email' as const,
      required: true,
      placeholder: 'you@example.com',
    },
    {
      name: 'service',
      label: 'What are you after?',
      type: 'select' as const,
      required: false,
      options: [
        { label: 'Full groom', value: 'full_groom' },
        { label: 'Bath & tidy', value: 'bath_tidy' },
        { label: 'Puppy first cut', value: 'puppy_first' },
        { label: 'De-shed treatment', value: 'deshed' },
        { label: 'Just saying hi', value: 'hi' },
      ],
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea' as const,
      required: true,
      placeholder: 'Tell us about your dog — breed, quirks, whatever helps.',
    },
    {
      name: 'consent',
      label: 'You can write back to me.',
      type: 'checkbox' as const,
      required: true,
      help: "By sending, you consent to us replying. That's it.",
    },
  ] satisfies FormField[],
};
