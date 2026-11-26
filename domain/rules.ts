import { demoDay, morningCapacity, type Invoice, type PriorityTier, type PromiseStatus, type Settlement } from './model.ts'

export function daysBetween(start: string, end: string) {
  return (Date.parse(end) - Date.parse(start)) / 86_400_000
}

export function overdueDays(invoice: Invoice) {
  return Math.max(0, daysBetween(invoice.dueDate, demoDay))
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

  if (promise === 'broken') return 'P0'
  if (neverContacted(invoice) && dispute !== 'open') return 'P0'
  if (invoice.invoiceAccuracy === 'unverified_claim') return 'P0'

  if (unansweredFollowUps(invoice) >= 2 && invoice.accountManager) return 'P1'
  if (dispute === 'open') return 'P1'

  if (promise === 'active') return 'P2'

  return 'P1'
}

function p0Rank(invoice: Invoice): number {
  const promise = promiseStatus(invoice)
  if (promise === 'broken') return 0
  if (neverContacted(invoice) && disputeStatus(invoice) !== 'open') return 1
  if (invoice.invoiceAccuracy === 'unverified_claim') return 2
  return 99
}

function tieBreak(a: Invoice, b: Invoice) {
  const remainingDiff = remaining(b) - remaining(a)
  if (remainingDiff !== 0) return remainingDiff
  return overdueDays(b) - overdueDays(a)
}

export function explainPriority(invoice: Invoice) {
  const tier = priorityTier(invoice)
  const promise = promiseStatus(invoice)
  switch (tier) {
    case 'P0':
      if (promise === 'broken') {
        return { tier, reason: 'Broken promise — committed cash failed; escalate follow-up.' }
      }
      if (neverContacted(invoice) && disputeStatus(invoice) !== 'open') {
        return { tier, reason: 'Never contacted, no open dispute — cheap first touch before aging worsens.' }
      }
      return { tier, reason: 'Invoice accuracy unverified — clarify details before hard chase.' }
    case 'P1':
      if (disputeStatus(invoice) === 'open') {
        return { tier, reason: 'Open dispute — route or evidence, not a cold reminder.' }
      }
      return { tier, reason: 'Escalation-ready — unanswered follow-ups with account manager available.' }
    case 'P2':
      return { tier, reason: 'Active promise not due — monitor; do not burn a morning slot.' }
    case 'P3':
      return { tier, reason: 'No remaining balance (or resolved) — not chase work.' }
    default: {
      const _exhaustive: never = tier
      return _exhaustive
    }
  }
}

/** Today’s 3: P0 in fixed order, then P1 backfill, capped by MorningCapacity. */
export function todaysThree(invoices: Invoice[]): Invoice[] {
  const active = invoices.filter(inActiveQueue)
  const p0 = active
    .filter(invoice => priorityTier(invoice) === 'P0')
    .sort((a, b) => p0Rank(a) - p0Rank(b) || tieBreak(a, b) || a.code.localeCompare(b.code))
  const p1 = active
    .filter(invoice => priorityTier(invoice) === 'P1')
    .sort((a, b) => tieBreak(a, b) || a.code.localeCompare(b.code))

  return [...p0, ...p1].slice(0, morningCapacity)
}
