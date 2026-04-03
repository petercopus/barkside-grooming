export const apptStatusOptions = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

export const apptStatusColor: Record<
  string,
  'success' | 'error' | 'primary' | 'warning' | 'info' | 'neutral'
> = {
  pending: 'warning',
  confirmed: 'primary',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'error',
  no_show: 'error',
};
