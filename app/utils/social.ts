const SOCIAL_ICONS: Record<string, string> = {
  facebook: 'i-lucide-facebook',
  instagram: 'i-lucide-instagram',
  twitter: 'i-lucide-twitter',
  x: 'i-lucide-twitter',
  youtube: 'i-lucide-youtube',
  linkedin: 'i-lucide-linkedin',
};

export function socialIcon(service: string | undefined | null): string {
  if (!service) return 'i-lucide-link';
  return SOCIAL_ICONS[service] ?? 'i-lucide-link';
}
