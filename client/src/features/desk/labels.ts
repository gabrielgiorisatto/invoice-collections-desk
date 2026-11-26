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
import { invoiceStatus, type StatusKind } from './status.ts'

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

/** One primary status line for the drawer header — not repeated elsewhere. */
export function primaryStatusLine(invoice: Invoice): string {
  const { kind }: { kind: StatusKind } = invoiceStatus(invoice)
  switch (kind) {
    case 'open':
      return 'Open balance — ready to chase.'
    case 'promised':
      return 'Active payment promise on file.'
    case 'broken':
      return 'Broken payment promise — still unpaid.'
    case 'disputed':
      return 'Open commercial dispute — chase paused.'
    case 'unverified':
      return 'Invoice details need verification before chase.'
    case 'partial':
      return 'Partially paid — remaining balance is open.'
    case 'paid':
      return 'Fully paid.'
    case 'resolved':
      return 'Resolved without full payment.'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
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
