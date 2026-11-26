import {
  disputeStatus,
  priorityTier,
  promiseStatus,
  type Invoice,
  type PriorityTier,
} from '@domain/index.ts'
import { invoiceStatus } from './status.ts'

/** Visual weight for a glance cell or drawer state. Not a new status. */
export type GlanceTone = 'quiet' | 'attention' | 'caution' | 'wait' | 'ok' | 'neutral'

/** Table-only short glance labels — not shared with drawer copy. */

export function glancePriority(tier: PriorityTier): string {
  switch (tier) {
    case 'P0':
      return 'High'
    case 'P1':
      return 'Med'
    case 'P2':
      return 'Low'
    case 'P3':
      return 'Clear'
    default: {
      const _exhaustive: never = tier
      return _exhaustive
    }
  }
}

export function glanceStatus(invoice: Invoice): string {
  const { kind } = invoiceStatus(invoice)
  switch (kind) {
    case 'open':
      return 'Open'
    case 'promised':
      return 'Promised'
    case 'broken':
      return 'Broken'
    case 'disputed':
      return 'Disputed'
    case 'unverified':
      return 'Needs check'
    case 'partial':
      return 'Partial'
    case 'paid':
      return 'Paid'
    case 'resolved':
      return 'Resolved'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function glancePromise(invoice: Invoice): string {
  const status = promiseStatus(invoice)
  switch (status) {
    case 'none':
      return '—'
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

export function glanceDispute(invoice: Invoice): string {
  const status = disputeStatus(invoice)
  switch (status) {
    case 'none':
      return '—'
    case 'open':
      return 'Open'
    case 'resolved':
      return 'Closed'
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function glanceDetails(invoice: Invoice): string {
  return invoice.invoiceAccuracy === 'ok' ? 'Verified' : 'Needs check'
}

export function glanceStatusTone(invoice: Invoice): GlanceTone {
  const { kind } = invoiceStatus(invoice)
  switch (kind) {
    case 'open':
    case 'promised':
    case 'partial':
      return 'wait'
    case 'broken':
    case 'unverified':
      return 'attention'
    case 'disputed':
      return 'caution'
    case 'paid':
      return 'ok'
    case 'resolved':
      return 'neutral'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function glancePromiseTone(invoice: Invoice): GlanceTone {
  const status = promiseStatus(invoice)
  switch (status) {
    case 'none':
      return 'neutral'
    case 'active':
      return 'wait'
    case 'broken':
      return 'attention'
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function glanceDisputeTone(invoice: Invoice): GlanceTone {
  const status = disputeStatus(invoice)
  switch (status) {
    case 'none':
    case 'open':
      return 'neutral'
    case 'resolved':
      return 'ok'
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function glanceDetailsTone(invoice: Invoice): GlanceTone {
  return invoice.invoiceAccuracy === 'ok' ? 'wait' : 'attention'
}

export function priorityToneClass(tier: PriorityTier): string {
  switch (tier) {
    case 'P0':
      return 'prio-p0'
    case 'P1':
      return 'prio-p1'
    case 'P2':
      return 'prio-p2'
    case 'P3':
      return 'prio-p3'
    default: {
      const _exhaustive: never = tier
      return _exhaustive
    }
  }
}

/** Soft table row tint class by priority tier (P0–P3). */
export function priorityRowClass(invoice: Invoice): string {
  const tier = priorityTier(invoice)
  switch (tier) {
    case 'P0':
      return 'row-p0'
    case 'P1':
      return 'row-p1'
    case 'P2':
      return 'row-p2'
    case 'P3':
      return 'row-p3'
    default: {
      const _exhaustive: never = tier
      return _exhaustive
    }
  }
}
