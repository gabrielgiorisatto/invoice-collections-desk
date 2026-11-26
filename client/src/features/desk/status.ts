import {
  disputeStatus,
  inActiveQueue,
  promiseStatus,
  settlement,
  type Invoice,
} from '@domain/index.ts'

export type StatusKind =
  | 'open'
  | 'promised'
  | 'broken'
  | 'disputed'
  | 'unverified'
  | 'partial'
  | 'paid'
  | 'resolved'

const statusLabels: Record<StatusKind, string> = {
  open: 'Open',
  promised: 'Promised',
  broken: 'Broken promise',
  disputed: 'Disputed',
  unverified: 'Needs verification',
  partial: 'Partial',
  paid: 'Paid',
  resolved: 'Resolved',
}

export function invoiceStatus(invoice: Invoice): { kind: StatusKind; label: string } {
  let kind: StatusKind
  if (!inActiveQueue(invoice)) {
    kind = settlement(invoice) === 'paid' ? 'paid' : 'resolved'
  } else if (disputeStatus(invoice) === 'open') {
    kind = 'disputed'
  } else {
    const promise = promiseStatus(invoice)
    if (promise === 'broken') kind = 'broken'
    else if (promise === 'active') kind = 'promised'
    else if (settlement(invoice) === 'partial') kind = 'partial'
    else if (invoice.invoiceAccuracy === 'unverified_claim') kind = 'unverified'
    else kind = 'open'
  }
  return { kind, label: statusLabels[kind] }
}

/** @deprecated Prefer invoiceStatus — kept for callers that only need the label. */
export function invoiceStatusLabel(invoice: Invoice): string {
  return invoiceStatus(invoice).label
}
