import {
  disputeStatus,
  inActiveQueue,
  promiseStatus,
  settlement,
  type Invoice,
} from '@domain/index.ts'

export function invoiceStatusLabel(invoice: Invoice): string {
  if (!inActiveQueue(invoice)) {
    if (settlement(invoice) === 'paid') return 'paid'
    return 'resolved'
  }
  if (disputeStatus(invoice) === 'open') return 'disputed'
  const promise = promiseStatus(invoice)
  if (promise === 'broken') return 'broken promise'
  if (promise === 'active') return 'promised'
  if (settlement(invoice) === 'partial') return 'partial'
  if (invoice.invoiceAccuracy === 'unverified_claim') return 'unverified'
  return 'open'
}
