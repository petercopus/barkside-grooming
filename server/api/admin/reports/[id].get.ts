import { db } from '~~/server/db';
import { getReport } from '~~/server/reports';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'reports:view');

  const reportId = getRouterParam(event, 'id');
  const report = getReport(reportId!);

  if (!report) {
    throw createError({ statusCode: 404, message: 'Report not found' });
  }

  requirePermission(event, report.permission);

  const query = getQuery(event);
  const filters: Record<string, unknown> = {};

  // resolve filter values. If none, use defaults
  for (const filter of report.filters) {
    const value = query[filter.key];
    if (value !== undefined && value !== '') {
      filters[filter.key] = value;
    } else if (filter.default !== undefined) {
      filters[filter.key] =
        typeof filter.default === 'function' ? filter.default() : filter.default;
    }
  }

  const result = await report.execute(db, filters);

  // strip execute function from metadata
  const resolvedFilters = report.filters.map((f) => ({
    ...f,
    default: typeof f.default === 'function' ? f.default() : f.default,
  }));

  return {
    meta: {
      id: report.id,
      name: report.name,
      description: report.description,
      category: report.category,
      display: report.display,
      filters: resolvedFilters,
    },
    result,
  };
});
