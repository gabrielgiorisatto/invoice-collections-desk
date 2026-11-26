import type { Change, Invoice } from './model.ts'
import { disputeStatus, inActiveQueue, promiseStatus, remaining, settlement } from './rules.ts'

export type ActionKind = Change['type']

/** Fixed UI order for the full action set (enabled + disabled). */
export const actionDisplayOrder: ActionKind[] = [
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

  return actionDisplayOrder.filter(kind => allowed.has(kind))
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

/** Why an action is disabled for this invoice, or null when enabled. */
export function actionDisabledReason(invoice: Invoice, kind: ActionKind): string | null {
  if (availableActions(invoice).includes(kind)) return null

  if (!inActiveQueue(invoice)) {
    return settlement(invoice) === 'paid'
      ? 'Invoice is paid — no further actions.'
      : 'Invoice is resolved — no further actions.'
  }

  const promise = promiseStatus(invoice)
  const dispute = disputeStatus(invoice)

  if (dispute === 'open') {
    return 'Not available while a dispute is open.'
  }
  if (promise === 'active') {
    return 'Not available while a payment promise is active. Record payment or resolve.'
  }
  if (promise === 'broken') {
    return 'Broken promise — use follow-up, a new promise, or payment.'
  }
  if (invoice.invoiceAccuracy === 'unverified_claim') {
    return 'Verify invoice details before chasing, or mark a dispute.'
  }
  if (kind === 'route-am') return 'Route to account manager is for open disputes.'
  if (kind === 'resolve') return 'Resolve is for active promises or open disputes.'
  if (kind === 'payment') return 'Nothing remaining to pay.'
  return 'Not available for this invoice state.'
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
    purpose: 'Record cash against remaining balance. Paying in full leaves the queue.',
    confirm: 'Save payment',
  },
  resolve: {
    label: 'Resolve (not paid)',
    hint: 'Leave queue without cash.',
    purpose: 'Close the invoice commercially without counting payment. Choose a resolution reason.',
    confirm: 'Resolve invoice',
  },
  dispute: {
    label: 'Mark dispute',
    hint: 'Open or update a commercial dispute.',
    purpose: 'Flag a commercial dispute so this is not treated as a cold chase.',
    confirm: 'Save dispute',
  },
  'route-am': {
    label: 'Route to account manager',
    hint: 'Simulation — hand off to account manager.',
    purpose: 'Labeled simulation only. Hands ownership to the account manager with a next-action note.',
    confirm: 'Route (simulation)',
  },
  'verify-accuracy': {
    label: 'Verify invoice details',
    hint: 'Confirm invoice details are correct.',
    purpose: 'Mark invoice details as verified after you confirm remittance information.',
    confirm: 'Mark verified',
  },
}
