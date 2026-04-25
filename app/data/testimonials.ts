export interface Testimonial {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  rating: number;
}

export const testimonials: Testimonial[] = [
  {
    id: '1',
    title: 'Sarah M.',
    subtitle: 'Golden retriever parent',
    content: 'My golden retriever has never looked better! The team at Barkside is amazing.',
    rating: 5,
  },
  {
    id: '2',
    title: 'James K.',
    subtitle: 'Dachshund dad',
    content: 'Friendly staff and my anxious pup was so calm the entire time. Highly recommend!',
    rating: 5,
  },
  {
    id: '3',
    title: 'Lisa R.',
    subtitle: 'Poodle mum',
    content: 'Great prices, convenient booking, and my dog actually enjoys going. Win-win-win!',
    rating: 4,
  },
];
