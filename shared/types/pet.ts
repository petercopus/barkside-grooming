import type { SerializeObject } from 'nitropack';
import type { pets } from '~~/server/db/schema';

export type Pet = SerializeObject<typeof pets.$inferSelect>;
