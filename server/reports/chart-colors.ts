const CORAL_500 = 'rgba(205, 103, 72, 0.75)';
const BARKSIDE_500 = 'rgba(58, 101, 133, 0.75)';

export const STATUS_PALETTE = {
  warning: 'rgba(249, 115, 22, 0.75)',
  primary: CORAL_500,
  info: 'rgba(14, 165, 233, 0.75)',
  success: 'rgba(16, 185, 129, 0.75)',
  error: 'rgba(239, 68, 68, 0.75)',
  errorMuted: 'rgba(239, 68, 68, 0.55)',
} as const;

export const brandChartColors = {
  primary: { bg: CORAL_500, border: 'rgb(205, 103, 72)' },
  secondary: { bg: BARKSIDE_500, border: 'rgb(58, 101, 133)' },
} as const;

export const brandChartSequence: string[] = [
  CORAL_500,
  BARKSIDE_500,
  'rgba(198, 164, 118, 0.75)',
  'rgba(224, 131, 106, 0.75)',
  'rgba(90, 126, 160, 0.75)',
  'rgba(169, 134, 89, 0.75)',
  'rgba(238, 167, 149, 0.75)',
  'rgba(31, 58, 79, 0.75)',
  'rgba(221, 195, 156, 0.75)',
  'rgba(104, 82, 58, 0.75)',
];

// Aligned with apptStatusColor (app/utils/appointment.ts)
export const appointmentStatusChartColors: Record<string, string> = {
  pending: STATUS_PALETTE.warning,
  pending_documents: STATUS_PALETTE.warning,
  confirmed: STATUS_PALETTE.primary,
  in_progress: STATUS_PALETTE.info,
  completed: STATUS_PALETTE.success,
  cancelled: STATUS_PALETTE.error,
  no_show: STATUS_PALETTE.errorMuted,
};

export const fallbackChartColor = 'rgba(139, 133, 137, 0.6)';
