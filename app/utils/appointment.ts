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

/* ─────────────────────────────────── *
 * Status transition helpers (admin)
 * ─────────────────────────────────── */
export type StatusAction = {
  label: string;
  icon: string;
  status: AppointmentStatus;
  color: BadgeColor;
};

const NEXT_ACTION: Partial<
  Record<AppointmentStatus, { label: string; icon: string; status: AppointmentStatus }>
> = {
  pending: { label: 'Confirm', icon: 'i-lucide-check', status: 'confirmed' },
  confirmed: { label: 'Check In', icon: 'i-lucide-log-in', status: 'in_progress' },
  in_progress: { label: 'Complete', icon: 'i-lucide-check-check', status: 'completed' },
};

export const CANCELLABLE_STATUSES: AppointmentStatus[] = [
  'pending',
  'pending_documents',
  'confirmed',
];

export const NO_SHOW_STATUSES: AppointmentStatus[] = ['confirmed'];

export function nextAction(currentStatus: AppointmentStatus): StatusAction | null {
  const next = NEXT_ACTION[currentStatus];
  if (!next) return null;
  return { ...next, color: apptStatusColor[next.status]! };
}

export function canCancel(currentStatus: AppointmentStatus): boolean {
  return CANCELLABLE_STATUSES.includes(currentStatus);
}

export function canMarkNoShow(currentStatus: AppointmentStatus): boolean {
  return NO_SHOW_STATUSES.includes(currentStatus);
}

export type InvoiceStatus = 'draft' | 'finalized' | 'paid' | 'refunded' | 'void';

export const invoiceStatusColor: Record<string, BadgeColor> = {
  draft: 'warning',
  finalized: 'primary',
  paid: 'success',
  refunded: 'neutral',
  void: 'neutral',
} satisfies Record<InvoiceStatus, BadgeColor>;

export const invoiceStatusLabel: Record<string, string> = {
  draft: 'Draft',
  finalized: 'Finalized',
  paid: 'Paid',
  refunded: 'Refunded',
  void: 'Void',
} satisfies Record<InvoiceStatus, string>;
