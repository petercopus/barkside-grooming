import { documentTypeEnum } from '~~/shared/schemas/document';

export const docStatusColor: Record<string, 'warning' | 'success' | 'error' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

export const docReqStatusColor: Record<string, 'warning' | 'success' | 'error' | 'neutral'> = {
  pending: 'warning',
  fulfilled: 'success',
  expired: 'error',
};

export const docTypeItems = documentTypeEnum.options.map((val) => ({
  label: formatDocType(val),
  val,
}));

export function formatDocType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
