import { documentTypeEnum } from '~~/shared/schemas/document';

export type DocStatus = 'pending' | 'approved' | 'rejected';
export type DocReqStatus = 'pending' | 'fulfilled' | 'expired';
type DocBadgeColor = 'warning' | 'success' | 'error' | 'neutral';

export const docStatusColor: Record<string, DocBadgeColor> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
} satisfies Record<DocStatus, DocBadgeColor>;

export const docReqStatusColor: Record<string, DocBadgeColor> = {
  pending: 'warning',
  fulfilled: 'success',
  expired: 'error',
} satisfies Record<DocReqStatus, DocBadgeColor>;

export const docStatusLabel: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
} satisfies Record<DocStatus, string>;

export const docReqStatusLabel: Record<string, string> = {
  pending: 'Pending',
  fulfilled: 'Fulfilled',
  expired: 'Expired',
} satisfies Record<DocReqStatus, string>;

export const docTypeItems = documentTypeEnum.options.map((value) => ({
  label: formatDocType(value),
  value,
}));

export function formatDocType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
