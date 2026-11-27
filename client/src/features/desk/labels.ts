import {
  disputeStatus,
  explainPriority,
  promiseStatus,
  type DisputeStatus,
  type Invoice,
  type InvoiceAccuracy,
  type OwnerRole,
  type PromiseStatus,
  type ResolutionReason,
} from '@domain/index.ts'

export function disputeLabel(status: DisputeStatus): string {
  switch (status) {
    case 'none':
      return 'No dispute'
    case 'open':
      return 'Open'
    case 'resolved':
      return 'Resolved'
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function ownerLabel(role: OwnerRole): string {
  switch (role) {
    case 'operator':
      return 'Operator'
    case 'account_manager':
      return 'Account manager'
    default: {
      const _exhaustive: never = role
      return _exhaustive
    }
  }
}

export function resolutionReasonLabel(reason: ResolutionReason): string {
  switch (reason) {
    case 'dispute_closed':
      return 'Dispute closed'
    case 'credit_issued':
      return 'Credit issued'
    case 'other':
      return 'Other'
    default: {
      const _exhaustive: never = reason
      return _exhaustive
    }
  }
}

export function promiseLabel(status: PromiseStatus): string {
  switch (status) {
    case 'none':
      return 'No promise'
    case 'active':
      return 'Active'
    case 'broken':
      return 'Broken'
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

/** Drawer header. Same line Next up shows for this invoice. */
export function primaryStatusLine(invoice: Invoice): string {
  return explainPriority(invoice).reason
}

/** Drawer State block — short structured values, not table glance and not prose. */
export function promiseStateValue(invoice: Invoice): string {
  const status = promiseStatus(invoice)
  switch (status) {
    case 'none':
      return 'None'
    case 'active':
      return `Active due ${invoice.promise!.dueDate}`
    case 'broken':
      return 'Broken'
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function disputeStateValue(invoice: Invoice): string {
  const status = disputeStatus(invoice)
  switch (status) {
    case 'none':
      return 'None'
    case 'open':
      return 'Open'
    case 'resolved':
      return 'Resolved'
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function detailsStateValue(invoice: Invoice): string {
  const value: InvoiceAccuracy = invoice.invoiceAccuracy
  switch (value) {
    case 'ok':
      return 'Verified'
    case 'unverified_claim':
      return 'Needs verification'
    default: {
      const _exhaustive: never = value
      return _exhaustive
    }
  }
}
