import type { Invoice, PromiseStatus } from './model.ts'
import {
  disputeStatus,
  compareMorningOrder,
  inActiveQueue,
  overdueDays,
  priorityTier,
  promiseStatus,
  remaining,
  settlement,
} from './rules.ts'

/** Active-queue status facet — mirrors table glance Status values. */
export type QueueStatusFacet =
  | 'open'
  | 'promised'
  | 'broken'
  | 'disputed'
  | 'unverified'
  | 'partial'

/** Promise facet — none / active / broken. */
export type QueuePromiseFacet = PromiseStatus

/** Priority facet — High/Med/Low for P0/P1/P2 (Clear/P3 is out of active queue). */
export type QueuePriorityFacet = 'high' | 'med' | 'low'

export type QueueFilters = {
  status: QueueStatusFacet | null
  promise: QueuePromiseFacet | null
  priority: QueuePriorityFacet | null
}

export const emptyQueueFilters: QueueFilters = {
  status: null,
  promise: null,
  priority: null,
}

export const queueStatusFacetLabels: Record<QueueStatusFacet, string> = {
  open: 'Open',
  promised: 'Promised',
  broken: 'Broken',
  disputed: 'Disputed',
  unverified: 'Needs check',
  partial: 'Partial',
}

export const queuePromiseFacetLabels: Record<QueuePromiseFacet, string> = {
  none: 'No promise',
  active: 'Active',
  broken: 'Broken',
}

export const queuePriorityFacetLabels: Record<QueuePriorityFacet, string> = {
  high: 'High',
  med: 'Med',
  low: 'Low',
}

export function queueStatusKind(invoice: Invoice): QueueStatusFacet | 'paid' | 'resolved' {
  if (!inActiveQueue(invoice)) {
    return settlement(invoice) === 'paid' ? 'paid' : 'resolved'
  }
  if (disputeStatus(invoice) === 'open') return 'disputed'
  const promise = promiseStatus(invoice)
  if (promise === 'broken') return 'broken'
  if (promise === 'active') return 'promised'
  if (settlement(invoice) === 'partial') return 'partial'
  if (invoice.invoiceAccuracy === 'unverified_claim') return 'unverified'
  return 'open'
}

export function queuePriorityFacet(invoice: Invoice): QueuePriorityFacet | 'clear' {
  const tier = priorityTier(invoice)
  switch (tier) {
    case 'P0':
      return 'high'
    case 'P1':
      return 'med'
    case 'P2':
      return 'low'
    case 'P3':
      return 'clear'
    default: {
      const _exhaustive: never = tier
      return _exhaustive
    }
  }
}

export function queueFiltersActive(filters: QueueFilters): boolean {
  return filters.status !== null || filters.promise !== null || filters.priority !== null
}

export function describeQueueFilters(filters: QueueFilters): string[] {
  const parts: string[] = []
  if (filters.status) parts.push(`Status: ${queueStatusFacetLabels[filters.status]}`)
  if (filters.promise) parts.push(`Promise: ${queuePromiseFacetLabels[filters.promise]}`)
  if (filters.priority) parts.push(`Priority: ${queuePriorityFacetLabels[filters.priority]}`)
  return parts
}

export function matchesQueueFilters(invoice: Invoice, filters: QueueFilters): boolean {
  if (filters.status && queueStatusKind(invoice) !== filters.status) return false
  if (filters.promise && promiseStatus(invoice) !== filters.promise) return false
  if (filters.priority && queuePriorityFacet(invoice) !== filters.priority) return false
  return true
}

export function filterByQueueFilters(invoices: Invoice[], filters: QueueFilters): Invoice[] {
  if (!queueFiltersActive(filters)) return [...invoices]
  return invoices.filter(invoice => matchesQueueFilters(invoice, filters))
}

export type QueueSortColumn =
  | 'invoice'
  | 'remaining'
  | 'due'
  | 'priority'
  | 'status'
  | 'promise'
  | 'dispute'
  | 'details'

const statusRank: Record<ReturnType<typeof queueStatusKind>, number> = {
  broken: 0,
  disputed: 1,
  unverified: 2,
  open: 3,
  partial: 4,
  promised: 5,
  paid: 6,
  resolved: 7,
}

const promiseRank: Record<PromiseStatus, number> = { broken: 0, active: 1, none: 2 }
const disputeRank = { open: 0, resolved: 1, none: 2 } as const

export function compareQueueColumn(a: Invoice, b: Invoice, column: QueueSortColumn): number {
  switch (column) {
    case 'invoice':
      return a.code.localeCompare(b.code) || a.customer.localeCompare(b.customer)
    case 'remaining':
      return remaining(a) - remaining(b)
    case 'due':
      return a.dueDate.localeCompare(b.dueDate) || overdueDays(b) - overdueDays(a)
    case 'priority':
      return compareMorningOrder(a, b)
    case 'status':
      return statusRank[queueStatusKind(a)] - statusRank[queueStatusKind(b)]
    case 'promise':
      return promiseRank[promiseStatus(a)] - promiseRank[promiseStatus(b)]
    case 'dispute':
      return disputeRank[disputeStatus(a)] - disputeRank[disputeStatus(b)]
    case 'details': {
      const aRank = a.invoiceAccuracy === 'unverified_claim' ? 0 : 1
      const bRank = b.invoiceAccuracy === 'unverified_claim' ? 0 : 1
      return aRank - bRank
    }
    default: {
      const _exhaustive: never = column
      return _exhaustive
    }
  }
}

export function sortQueue(
  invoices: Invoice[],
  column: QueueSortColumn,
  order: 'ascend' | 'descend',
): Invoice[] {
  const factor = order === 'ascend' ? 1 : -1
  return [...invoices].sort((a, b) => {
    const primary = compareQueueColumn(a, b, column) * factor
    if (primary !== 0) return primary
    return a.code.localeCompare(b.code)
  })
}
