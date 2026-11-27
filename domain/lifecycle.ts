import type { Change, Invoice } from './model.ts'
import { disputeStatus, inActiveQueue, promiseStatus, settlement } from './rules.ts'

export type ActionKind = Change['type']

export type ActionGroup = {
  id: string
  label: string
  kinds: readonly ActionKind[]
}

/**
 * Drawer groups. Payment and resolve share a group.
 * Route to AM is its own group — it is not a follow-up.
 */
export const actionGroups: readonly ActionGroup[] = [
  { id: 'contact', label: 'Contact', kinds: ['follow-up'] },
  { id: 'details', label: 'Invoice details', kinds: ['flag-details', 'confirm-details', 'cancel-details'] },
  { id: 'promise', label: 'Promise', kinds: ['promise', 'cancel-promise'] },
  { id: 'dispute', label: 'Dispute', kinds: ['dispute', 'cancel-dispute'] },
  { id: 'settlement', label: 'Payment and resolve', kinds: ['payment', 'resolve'] },
  { id: 'account-manager', label: 'Account manager', kinds: ['route-am'] },
]

/** Fixed UI order: group order, then kind order inside the group. */
export const actionDisplayOrder: ActionKind[] = actionGroups.flatMap(group => [...group.kinds])

type ActionCopy = { label: string; hint: string; purpose: string; confirm: string }

export const actionCatalog: Record<ActionKind, ActionCopy> = {
  'follow-up': {
    label: 'Record follow-up',
    hint: 'Contact note only — does not change invoice details.',
    purpose: 'Log a contact attempt. This does not mark cash received, flag invoice details, or route to an account manager.',
    confirm: 'Save follow-up',
  },
  'flag-details': {
    label: 'Flag details for review',
    hint: 'One open request. Not available while one is already open.',
    purpose: 'Open the single details request when remittance or line items look wrong.',
    confirm: 'Flag for review',
  },
  'confirm-details': {
    label: 'Confirm details verified',
    hint: 'Closes the open details request as verified.',
    purpose: 'Mark the open details request as verified after you confirm remittance information.',
    confirm: 'Confirm verified',
  },
  'cancel-details': {
    label: 'Cancel details request',
    hint: 'Withdraw the open request without calling it verified.',
    purpose: 'Cancel the one open details request. This does not confirm the details and does not open a second flag.',
    confirm: 'Cancel request',
  },
  promise: {
    label: 'Record promise',
    hint: 'One promise at a time.',
    purpose: 'Save the one dated payment promise. Future dates stay active; past unpaid dates are broken.',
    confirm: 'Save promise',
  },
  'cancel-promise': {
    label: 'Cancel promise',
    hint: 'Remove the one promise. It stays in history.',
    purpose: 'Cancel the current promise. The commitment stays in the activity history. This does not record a second promise.',
    confirm: 'Cancel promise',
  },
  payment: {
    label: 'Record payment',
    hint: 'Attest cash (full or partial).',
    purpose: 'Record cash against remaining balance. Paying in full leaves the queue.',
    confirm: 'Save payment',
  },
  dispute: {
    label: 'Open dispute',
    hint: 'Commercial dispute — not a cold chase.',
    purpose: 'Open the one commercial dispute so this is not treated as a cold chase. A broken promise stays on the invoice.',
    confirm: 'Open dispute',
  },
  'cancel-dispute': {
    label: 'Cancel dispute',
    hint: 'Close the open dispute. It stays on the record as resolved.',
    purpose: 'Cancel the open dispute. This is not a follow-up and does not delete the history.',
    confirm: 'Cancel dispute',
  },
  'route-am': {
    label: 'Route to AM',
    hint: 'Hands the next step to the account manager.',
    purpose: 'Hand the next step to the account manager. Available on any active invoice. This is its own action, not a follow-up. Labeled simulation.',
    confirm: 'Route (simulation)',
  },
  resolve: {
    label: 'Resolve without payment',
    hint: 'Leave queue without counting cash.',
    purpose: 'Close the invoice commercially without counting payment. Choose a resolution reason.',
    confirm: 'Resolve invoice',
  },
}

/** Label and copy for this invoice. Promise and dispute say update when one is already open. */
export function actionPresentation(invoice: Invoice, kind: ActionKind): ActionCopy {
  const base = actionCatalog[kind]
  if (kind === 'promise' && invoice.promise) {
    return {
      ...base,
      label: 'Update promise',
      hint: 'Changes the one promise. Does not add a second.',
      purpose: 'Update the existing payment promise. Cancel it if the commitment is gone. This does not stack a second promise.',
      confirm: 'Update promise',
    }
  }
  if (kind === 'dispute' && disputeStatus(invoice) === 'open') {
    return {
      ...base,
      label: 'Update dispute',
      hint: 'Edit the open dispute. Cancel it separately.',
      purpose: 'Update the open commercial dispute. This does not open a second dispute. A broken promise, if any, stays on the invoice.',
      confirm: 'Update dispute',
    }
  }
  return base
}

/**
 * Which ActionKinds are legal for this invoice.
 * Follow-up is contact-only and always legal in the active queue.
 * Details, promise, and dispute each allow one open item: create/flag, then update or cancel — never a second on top.
 * Payment, resolve, and route to AM are always legal in the active queue.
 * Paid / resolved → none.
 */
export function availableActions(invoice: Invoice): ActionKind[] {
  if (!inActiveQueue(invoice)) return []

  const allowed = new Set<ActionKind>([
    'follow-up',
    'promise',
    'dispute',
    'payment',
    'resolve',
    'route-am',
  ])

  if (invoice.invoiceAccuracy === 'unverified_claim') {
    allowed.add('confirm-details')
    allowed.add('cancel-details')
  } else {
    allowed.add('flag-details')
  }

  if (invoice.promise) allowed.add('cancel-promise')

  if (disputeStatus(invoice) === 'open') allowed.add('cancel-dispute')

  return actionDisplayOrder.filter(kind => allowed.has(kind))
}

export function primaryActionKind(invoice: Invoice): ActionKind | null {
  const allowed = availableActions(invoice)
  if (!allowed.length) return null
  const promise = promiseStatus(invoice)
  const dispute = disputeStatus(invoice)
  const preferred: ActionKind[] =
    dispute === 'open' ? ['route-am', 'dispute', 'resolve', 'payment', 'follow-up']
      : promise === 'broken' ? ['follow-up', 'promise', 'payment', 'dispute']
        : promise === 'active' ? ['payment', 'resolve', 'follow-up']
          : invoice.invoiceAccuracy === 'unverified_claim' ? ['confirm-details', 'dispute', 'follow-up', 'payment']
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

  switch (kind) {
    case 'flag-details':
      return 'A details request is already open. Confirm it or cancel it — no second flag.'
    case 'confirm-details':
      return 'No open details request. Flag details if something looks wrong.'
    case 'cancel-details':
      return 'No open details request to cancel.'
    case 'cancel-promise':
      return 'No promise to cancel.'
    case 'cancel-dispute':
      return 'No open dispute to cancel.'
    case 'payment':
      return 'Nothing remaining to pay.'
    case 'follow-up':
    case 'promise':
    case 'dispute':
    case 'resolve':
    case 'route-am':
      return 'Not available for this invoice state.'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}
