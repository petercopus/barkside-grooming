import type { db } from '~~/server/db';
import type {
  FilterField,
  ReportDisplay,
  ReportResult,
  ReportMeta as SharedReportMeta,
} from '~~/shared/types/report';

export type DrizzleDB = typeof db;

// re export shared types so report definitions can import from one place
export type {
  ChartData,
  ChartDataset,
  FilterField,
  KpiItem,
  ReportDisplay,
  ReportResult,
  TableColumn,
  TableData,
} from '~~/shared/types/report';

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  permission: string;
  filters: FilterField[];
  display: ReportDisplay;
  execute: (db: DrizzleDB, filters: Record<string, unknown>) => Promise<ReportResult>;
}

// metadata sent to the client (no execute)
export type ReportMeta = Omit<ReportDefinition, 'execute'>;

export function defineReport(def: ReportDefinition): ReportDefinition {
  return def;
}
