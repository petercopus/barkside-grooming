export type AppointmentStatus =
  | 'pending'
  | 'pending_documents'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type BadgeColor = 'success' | 'error' | 'primary' | 'warning' | 'info' | 'neutral';

export const apptStatusOptions: AppointmentStatus[] = [
  'pending',
  'pending_documents',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

export const apptStatusColor: Record<string, BadgeColor> = {
  pending: 'warning',
  pending_documents: 'warning',
  confirmed: 'primary',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'error',
  no_show: 'error',
} satisfies Record<AppointmentStatus, BadgeColor>;

export const apptStatusLabel: Record<string, string> = {
  pending: 'Pending',
  pending_documents: 'Pending Documents',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
} satisfies Record<AppointmentStatus, string>;

export type InvoiceStatus = 'draft' | 'finalized' | 'paid' | 'void';

export const invoiceStatusColor: Record<string, BadgeColor> = {
  draft: 'warning',
  finalized: 'primary',
  paid: 'success',
  void: 'neutral',
} satisfies Record<InvoiceStatus, BadgeColor>;

export const invoiceStatusLabel: Record<string, string> = {
  draft: 'Draft',
  finalized: 'Finalized',
  paid: 'Paid',
  void: 'Void',
} satisfies Record<InvoiceStatus, string>;
