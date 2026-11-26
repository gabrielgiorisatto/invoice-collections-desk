import {
  disputeStatus,
  inActiveQueue,
  promiseStatus,
  settlement,
  type Invoice,
} from '@domain/index.ts'

export function invoiceStatusLabel(invoice: Invoice): { label: string; color: string } {
  if (!inActiveQueue(invoice)) {
    if (settlement(invoice) === 'paid') return { label: 'paid', color: 'success' }
    return { label: 'resolved', color: 'default' }
  }
  const dispute = disputeStatus(invoice)
  if (dispute === 'open') return { label: 'disputed', color: 'error' }
  const promise = promiseStatus(invoice)
  if (promise === 'broken') return { label: 'broken promise', color: 'warning' }
  if (promise === 'active') return { label: 'promised', color: 'processing' }
  if (settlement(invoice) === 'partial') return { label: 'partial', color: 'gold' }
  if (invoice.invoiceAccuracy === 'unverified_claim') return { label: 'unverified', color: 'orange' }
  return { label: 'open', color: 'default' }
}
