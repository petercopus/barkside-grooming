export interface NavItem {
  label: string;
  to: string;
}

export const mainNav: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/services' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Book Now', to: '/book' },
];

export const footerNav: NavItem[] = [
  { label: 'Services', to: '/services' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Book', to: '/book' },
];
