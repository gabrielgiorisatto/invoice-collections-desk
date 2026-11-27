import { demoDay, morningCapacity, type Invoice, type PriorityTier, type PromiseStatus, type Settlement } from './model.ts'


export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))
    && new Date(value + 'T12:00:00.000Z').toISOString().slice(0, 10) === value
}

export function totalPayments(invoices: Invoice[]) {
  return invoices.reduce((sum, invoice) => sum + invoice.payments.reduce((s, p) => s + p.amount, 0), 0)
}

export function totalFollowUps(invoices: Invoice[]) {
  return invoices.reduce((sum, invoice) => sum + invoice.followUps.length, 0)
}

export function daysBetween(start: string, end: string) {
  return (Date.parse(end) - Date.parse(start)) / 86_400_000
}

export function overdueDays(invoice: Invoice) {
  return Math.max(0, daysBetween(invoice.dueDate, demoDay))
}

/** Exact due date; when overdue, append days in parentheses. */
export function formatDueDate(invoice: Invoice): string {
  const days = overdueDays(invoice)
  if (days <= 0) return invoice.dueDate
  return `${invoice.dueDate} (${days}d overdue)`
}

export function remaining(invoice: Invoice) {
  const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)
  return Math.max(0, invoice.amount - paid)
}

export function settlement(invoice: Invoice): Settlement {
  const left = remaining(invoice)
  if (left <= 0) return 'paid'
  if (left < invoice.amount) return 'partial'
  return 'open'
}

export function promiseStatus(invoice: Invoice): PromiseStatus {
  if (!invoice.promise) return 'none'
  return invoice.promise.dueDate < demoDay ? 'broken' : 'active'
}

export function disputeStatus(invoice: Invoice) {
  return invoice.dispute?.status ?? 'none'
}

export function neverContacted(invoice: Invoice) {
  return invoice.followUps.length === 0
}

export function unansweredFollowUps(invoice: Invoice) {
  return invoice.followUps.filter(item => !item.answered).length
}

export function inActiveQueue(invoice: Invoice) {
  if (invoice.resolved) return false
  return remaining(invoice) > 0
}

/**
 * Explainable priority tier from typed enums — not a point score.
 * First matching rule wins (see ADR-0001).
 */
export function priorityTier(invoice: Invoice): PriorityTier {
  if (!inActiveQueue(invoice) || remaining(invoice) === 0) return 'P3'

  const promise = promiseStatus(invoice)
  const dispute = disputeStatus(invoice)

  // Open dispute is not a cold chase, even when a broken promise is still on the invoice.
  if (promise === 'broken') return dispute === 'open' ? 'P1' : 'P0'
  if (promise === 'active') return 'P2'
  if (neverContacted(invoice) && dispute !== 'open') return 'P0'
  if (invoice.invoiceAccuracy === 'unverified_claim') return 'P0'

  if (unansweredChase(invoice)) return 'P1'
  if (dispute === 'open') return 'P1'

  return 'P1'
}

function p0Rank(invoice: Invoice): number {
  const promise = promiseStatus(invoice)
  if (promise === 'broken') return 0
  if (neverContacted(invoice) && disputeStatus(invoice) !== 'open') return 1
  if (invoice.invoiceAccuracy === 'unverified_claim') return 2
  return 99
}

const tierRank = { P0: 0, P1: 1, P2: 2, P3: 3 } as const

function tieBreak(a: Invoice, b: Invoice) {
  const remainingDiff = remaining(b) - remaining(a)
  if (remainingDiff !== 0) return remainingDiff
  return overdueDays(b) - overdueDays(a)
}

/** Next up and the queue table share this order. P0 is broken, then never contacted, then unverified. */
export function compareMorningOrder(a: Invoice, b: Invoice): number {
  const tierDiff = tierRank[priorityTier(a)] - tierRank[priorityTier(b)]
  if (tierDiff !== 0) return tierDiff
  if (priorityTier(a) === 'P0') {
    const rankDiff = p0Rank(a) - p0Rank(b)
    if (rankDiff !== 0) return rankDiff
  }
  return tieBreak(a, b) || a.code.localeCompare(b.code)
}

/**
 * Unanswered only while every recorded follow-up is unanswered.
 * One answered follow-up clears it. A cancelled dispute is not this case.
 */
function unansweredChase(invoice: Invoice) {
  if (disputeStatus(invoice) === 'resolved') return false
  if (invoice.followUps.some(item => item.answered)) return false
  return unansweredFollowUps(invoice) >= 2 && Boolean(invoice.accountManager)
}

/** One line for Next up and the drawer, from promise, dispute, details, and follow-up outcome. */
export function explainPriority(invoice: Invoice) {
  const tier = priorityTier(invoice)
  if (invoice.resolved) return { tier, reason: 'Resolved without full payment.' }
  if (remaining(invoice) === 0) return { tier, reason: 'Fully paid.' }

  const promise = promiseStatus(invoice)
  const dispute = disputeStatus(invoice)
  if (dispute === 'open') return { tier, reason: 'Open dispute — not a cold chase.' }
  if (promise === 'broken') return { tier, reason: 'Broken promise — escalate follow-up.' }
  if (promise === 'active') return { tier, reason: 'Active promise — wait.' }
  if (invoice.invoiceAccuracy === 'unverified_claim') {
    return { tier, reason: 'Invoice details need verification before chase.' }
  }
  if (neverContacted(invoice)) return { tier, reason: 'No contact yet — first follow-up.' }
  if (unansweredChase(invoice)) return { tier, reason: 'Unanswered follow-ups — AM available.' }
  return { tier, reason: 'Open balance — ready to chase.' }
}

/** Today’s 3: P0 in fixed order, then P1 backfill, capped by MorningCapacity. */
export function todaysThree(invoices: Invoice[]): Invoice[] {
  const active = invoices.filter(inActiveQueue)
  const p0 = active
    .filter(invoice => priorityTier(invoice) === 'P0')
    .sort(compareMorningOrder)
  const p1 = active
    .filter(invoice => priorityTier(invoice) === 'P1')
    .sort(compareMorningOrder)

  return [...p0, ...p1].slice(0, morningCapacity)
}
