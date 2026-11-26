import {
  disputeStatus,
  promiseStatus,
  type DisputeStatus,
  type Invoice,
  type InvoiceAccuracy,
  type OwnerRole,
  type PromiseStatus,
  type ResolutionReason,
} from '@domain/index.ts'

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

export function accuracyLabel(value: InvoiceAccuracy): string {
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

/**
 * Drawer value text (label is separate). Full wording, no “Promise:” prefix.
 * Never bare Open / None / Verified alone.
 */
export function promiseDetailValue(invoice: Invoice): string {
  const status = promiseStatus(invoice)
  switch (status) {
    case 'none':
      return 'No promise on file'
    case 'active':
      return `Active — due ${invoice.promise!.dueDate}`
    case 'broken':
      return `Broken — due ${invoice.promise!.dueDate}`
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function disputeDetailValue(invoice: Invoice): string {
  const status = disputeStatus(invoice)
  switch (status) {
    case 'none':
      return 'No dispute on file'
    case 'open':
      return `Open — ${invoice.dispute!.reason}`
    case 'resolved':
      return `Resolved — ${invoice.dispute!.reason}`
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function accuracyDetailValue(invoice: Invoice): string {
  return accuracyLabel(invoice.invoiceAccuracy)
}

export function invoicePromiseLabel(invoice: Invoice): string {
  return promiseLabel(promiseStatus(invoice))
}

export function invoiceDisputeLabel(invoice: Invoice): string {
  return disputeLabel(disputeStatus(invoice))
}

export function invoiceAccuracyLabel(invoice: Invoice): string {
  return accuracyLabel(invoice.invoiceAccuracy)
}
