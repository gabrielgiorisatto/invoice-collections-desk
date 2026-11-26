import type { Change, Invoice } from './model.ts'
import { disputeStatus, inActiveQueue, promiseStatus, remaining, settlement } from './rules.ts'

export type ActionKind = Change['type']

/** Fixed UI order for the full action set (enabled + disabled). */
export const actionDisplayOrder: ActionKind[] = [
  'follow-up',
  'flag-details',
  'confirm-details',
  'promise',
  'payment',
  'dispute',
  'route-am',
  'resolve',
]

/**
 * Lifecycle matrix: which ActionKinds are legal for this Invoice state.
 * State chips are read-only; these verbs change state + history.
 * Follow-up is contact-only — it never sets InvoiceAccuracy.
 * Paid / resolved → none. Remaining > 0 always allows payment.
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
    allowed.add('confirm-details')
    allowed.add('dispute')
  } else {
    allowed.add('follow-up')
    allowed.add('promise')
    allowed.add('dispute')
    allowed.add('flag-details')
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
          : invoice.invoiceAccuracy === 'unverified_claim' ? ['confirm-details', 'dispute', 'payment']
            : ['follow-up', 'promise', 'dispute', 'flag-details', 'payment']
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

  if (kind === 'flag-details' && invoice.invoiceAccuracy === 'unverified_claim') {
    return 'Details already need verification. Confirm them or open a dispute.'
  }
  if (kind === 'confirm-details' && invoice.invoiceAccuracy === 'ok') {
    return 'Details are already verified. Flag them for review if something looks wrong.'
  }
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
    return 'Confirm invoice details before chasing, or mark a dispute.'
  }
  if (kind === 'route-am') return 'Route to account manager is for open disputes.'
  if (kind === 'resolve') return 'Resolve is for active promises or open disputes.'
  if (kind === 'payment') return 'Nothing remaining to pay.'
  return 'Not available for this invoice state.'
}

export const actionCatalog: Record<ActionKind, { label: string; hint: string; purpose: string; confirm: string }> = {
  'follow-up': {
    label: 'Record follow-up',
    hint: 'Contact note only — does not change invoice details.',
    purpose: 'Log a contact attempt. This does not mark cash received and does not flag invoice details for review.',
    confirm: 'Save follow-up',
  },
  'flag-details': {
    label: 'Flag details for review',
    hint: 'Mark invoice details as needing verification.',
    purpose: 'Set invoice details to needs verification when remittance or line items look wrong.',
    confirm: 'Flag for review',
  },
  'confirm-details': {
    label: 'Confirm details verified',
    hint: 'Clear needs-verification after you check details.',
    purpose: 'Mark invoice details as verified after you confirm remittance information.',
    confirm: 'Confirm verified',
  },
  promise: {
    label: 'Record promise',
    hint: 'Customer committed to a pay date.',
    purpose: 'Save a dated payment promise. Future dates stay active; past unpaid dates are broken.',
    confirm: 'Save promise',
  },
  payment: {
    label: 'Record payment',
    hint: 'Attest cash (full or partial).',
    purpose: 'Record cash against remaining balance. Paying in full leaves the queue.',
    confirm: 'Save payment',
  },
  dispute: {
    label: 'Open or update dispute',
    hint: 'Commercial dispute — not a cold chase.',
    purpose: 'Open or update a commercial dispute so this is not treated as a cold chase.',
    confirm: 'Save dispute',
  },
  'route-am': {
    label: 'Route to AM',
    hint: 'Simulation — hand off to account manager.',
    purpose: 'Labeled simulation only. Hands ownership to the account manager with a next-action note.',
    confirm: 'Route (simulation)',
  },
  resolve: {
    label: 'Resolve without payment',
    hint: 'Leave queue without counting cash.',
    purpose: 'Close the invoice commercially without counting payment. Choose a resolution reason.',
    confirm: 'Resolve invoice',
  },
}
