import type { Change, Invoice } from './model.ts'
import { disputeStatus, inActiveQueue, promiseStatus, remaining } from './rules.ts'

export type ActionKind = Change['type']

const displayOrder: ActionKind[] = [
  'follow-up',
  'promise',
  'payment',
  'dispute',
  'verify-accuracy',
  'route-am',
  'resolve',
]

/**
 * Lifecycle matrix: which ActionKinds are legal for this Invoice state.
 * Paid / resolved → none. Otherwise state-specific set; Remaining > 0 always allows payment.
 */
export function availableActions(invoice: Invoice): ActionKind[] {
  if (!inActiveQueue(invoice)) return []

  const promise = promiseStatus(invoice)
  const dispute = disputeStatus(invoice)
  const allowed = new Set<ActionKind>()

  if (dispute === 'open') {
    allowed.add('dispute')
    allowed.add('route-am')
    allowed.add('resolve')
  } else if (promise === 'active') {
    allowed.add('payment')
    allowed.add('resolve')
  } else if (promise === 'broken') {
    allowed.add('follow-up')
    allowed.add('promise')
    allowed.add('payment')
  } else if (invoice.invoiceAccuracy === 'unverified_claim') {
    allowed.add('verify-accuracy')
    allowed.add('dispute')
  } else {
    allowed.add('follow-up')
    allowed.add('promise')
    allowed.add('dispute')
    allowed.add('verify-accuracy')
  }

  if (remaining(invoice) > 0) allowed.add('payment')

  return displayOrder.filter(kind => allowed.has(kind))
}

export function primaryActionKind(invoice: Invoice): ActionKind | null {
  const allowed = availableActions(invoice)
  if (!allowed.length) return null
  const promise = promiseStatus(invoice)
  const dispute = disputeStatus(invoice)
  const preferred: ActionKind[] =
    dispute === 'open' ? ['route-am', 'resolve', 'dispute', 'payment']
      : promise === 'broken' ? ['follow-up', 'promise', 'payment']
        : promise === 'active' ? ['payment', 'resolve']
          : invoice.invoiceAccuracy === 'unverified_claim' ? ['verify-accuracy', 'dispute', 'payment']
            : ['follow-up', 'promise', 'dispute', 'verify-accuracy', 'payment']
  return preferred.find(kind => allowed.includes(kind)) ?? allowed[0]
}

export const actionCatalog: Record<ActionKind, { label: string; hint: string; purpose: string; confirm: string }> = {
  'follow-up': {
    label: 'Record follow-up',
    hint: 'Log a contact attempt. Not payment.',
    purpose: 'Record that you contacted the customer. This does not mark cash received.',
    confirm: 'Save follow-up',
  },
  promise: {
    label: 'Record promise',
    hint: 'Customer committed to a pay date.',
    purpose: 'Save a dated payment promise. Future dates stay active; past unpaid dates are broken.',
    confirm: 'Save promise',
  },
  payment: {
    label: 'Payment received',
    hint: 'Attest cash (full or partial).',
    purpose: 'Record operator-attested cash against Remaining. Full pay leaves the queue.',
    confirm: 'Save payment',
  },
  resolve: {
    label: 'Resolve (not paid)',
    hint: 'Leave queue without cash.',
    purpose: 'Close the invoice commercially without counting payment. Requires ResolutionReason.',
    confirm: 'Resolve invoice',
  },
  dispute: {
    label: 'Mark dispute',
    hint: 'Open or update a commercial dispute.',
    purpose: 'Flag DisputeStatus so this is not treated as a cold chase.',
    confirm: 'Save dispute',
  },
  'route-am': {
    label: 'Route to AM',
    hint: 'Simulation — hand off to account manager.',
    purpose: 'Labeled simulation only. Sets OwnerRole to account_manager with a next-action note.',
    confirm: 'Route (simulation)',
  },
  'verify-accuracy': {
    label: 'Verify accuracy',
    hint: 'Confirm invoice details are correct.',
    purpose: 'Clear InvoiceAccuracy unverified_claim after you confirm remittance details.',
    confirm: 'Mark verified',
  },
}
