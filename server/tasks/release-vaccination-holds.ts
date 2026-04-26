import { releaseExpiredHolds } from '~~/server/services/vaccination-hold.service';

export default defineTask({
  meta: {
    name: 'release-vaccination-holds',
    description: 'Cancel pending_documents appointments whose hold window has elapsed',
  },
  async run() {
    const releasedCount = await releaseExpiredHolds();
    return {
      result: releasedCount === 0 ? 'No expired holds' : `Released ${releasedCount} appointment(s)`,
    };
  },
});
