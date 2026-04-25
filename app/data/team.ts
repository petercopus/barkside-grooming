export interface TeamMember {
  id: string;
  name: string;
  job_title: string;
  bio: string;
  image?: string;
}

export const team: TeamMember[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    job_title: 'Lead Groomer',
    bio: 'Certified pet stylist with 8 years of experience and a specialty in breed-specific cuts.',
  },
  {
    id: '2',
    name: 'Morgan Lee',
    job_title: 'Groomer',
    bio: 'Gentle touch expert — great with anxious pups and first-time visitors.',
  },
  {
    id: '3',
    name: 'Sam Rivera',
    job_title: 'Bather & Brusher',
    bio: 'Makes bath time the best time. Known for the fluffiest blowouts in town.',
  },
];
