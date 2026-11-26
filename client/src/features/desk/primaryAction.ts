import {
  disputeStatus,
  inActiveQueue,
  promiseStatus,
  type Invoice,
} from '@domain/index.ts'
import type { Change } from '@domain/index.ts'

export type ActionModal = Change['type']

export function primaryAction(invoice: Invoice): { type: ActionModal; label: string } | null {
  if (!inActiveQueue(invoice)) return null
  if (promiseStatus(invoice) === 'broken') return { type: 'follow-up', label: 'Record follow-up' }
  if (disputeStatus(invoice) === 'open') return { type: 'route-am', label: 'Route to AM' }
  if (invoice.invoiceAccuracy === 'unverified_claim') return { type: 'verify-accuracy', label: 'Verify accuracy' }
  if (promiseStatus(invoice) === 'active') return { type: 'payment', label: 'Payment received' }
  if (invoice.followUps.length === 0) return { type: 'follow-up', label: 'Record follow-up' }
  return { type: 'follow-up', label: 'Record follow-up' }
}
