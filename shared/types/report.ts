export interface FilterField {
  key: string;
  label: string;
  type: 'date' | 'select' | 'multiselect' | 'number' | 'text';
  options?: { label: string; value: string }[];
  default?: string | number | (() => string | number);
  required?: boolean;
}

export interface ReportDisplay {
  type: 'chart' | 'table' | 'chart+table' | 'kpi+chart' | 'kpi+table' | 'kpi+chart+table';
  chart?: { type: 'bar' | 'line' | 'pie' | 'doughnut' };
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface TableColumn {
  key: string;
  label: string;
  format?: 'currency' | 'number' | 'percent' | 'date';
}

export interface TableData {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
}

export interface KpiItem {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
}

export interface ReportResult {
  chart?: ChartData;
  table?: TableData;
  kpis?: KpiItem[];
}

export interface ReportMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  display: ReportDisplay;
  filters: FilterField[];
}
