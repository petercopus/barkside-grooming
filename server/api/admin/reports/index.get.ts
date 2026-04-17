import { listReports } from '~~/server/reports';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'reports:view');
  const reports = listReports();

  return { reports };
});
