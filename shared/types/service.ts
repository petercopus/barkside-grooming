import type { SerializeObject } from 'nitropack';
import type { services } from '~~/server/db/schema';

export type Service = SerializeObject<typeof services.$inferSelect>;

export interface ServiceWithPricing {
  id: number;
  name: string;
  description: string | null;
  isAddon: boolean;
  category: string | null;
  pricing: {
    priceCents: number;
    durationMinutes: number;
  };
}
