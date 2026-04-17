import { allReportDefinitions } from './definitions';
import type { ReportDefinition, ReportMeta } from './types';

export function getReport(id: string): ReportDefinition | undefined {
  return allReportDefinitions.find((r) => r.id === id);
}

export function listReports(): ReportMeta[] {
  return allReportDefinitions.map(({ execute, ...meta }) => meta);
}
