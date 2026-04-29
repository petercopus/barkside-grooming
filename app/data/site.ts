export const site = {
  title: 'Barkside Grooming',
  tagline: 'Where every pup gets the star treatment.',
  description: 'Small-batch grooming for dogs who deserve better than a production line.',
  email: 'hello@barkside.dev',
  phone: '(555) 123-BARK',
  street_address: '10 Woof Avenue',
  address_locality: 'Pawville',
  address_region: 'CA',
  postal_code: '64570',
  address_country: 'US',
  social_links: [
    { service: 'instagram', url: 'https://instagram.com/barkside' },
    { service: 'facebook', url: 'https://facebook.com/barkside' },
    { service: 'twitter', url: 'https://x.com/@barkside' },
  ],
} as const;

export const hours = [
  { day: 'Mon - Fri', time: '8 am - 6 pm' },
  { day: 'Saturday', time: '9 am - 4 pm' },
  { day: 'Sunday', time: 'Closed · nap day' },
] as const;
