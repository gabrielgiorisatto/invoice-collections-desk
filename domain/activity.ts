import type { FollowUp, Invoice, InvoiceEvent } from './model.ts'
import { historyLimit } from './model.ts'

export function followUpActivityDetail(followUp: Pick<FollowUp, 'channel' | 'note' | 'answered'>): string {
  const outcome = followUp.answered === true ? 'Answered' : 'Unanswered'
  return `${followUp.channel} · ${outcome} · ${followUp.note}`
}

function sameFollowUpLine(detail: string, followUp: FollowUp): boolean {
  const plain = `${followUp.channel} · ${followUp.note}`
  return detail === plain
    || detail === `${followUp.channel} · Answered · ${followUp.note}`
    || detail === `${followUp.channel} · Unanswered · ${followUp.note}`
}

/** History may have been stored as "channel · note". The follow-up boolean is the outcome. */
function stampFollowUpOutcomes(invoice: Invoice, events: InvoiceEvent[]): InvoiceEvent[] {
  const unused = invoice.followUps.map(item => ({ item, used: false }))
  return events.map(entry => {
    if (entry.title !== 'Follow-up recorded') return entry
    const match = unused.find(candidate =>
      !candidate.used
      && entry.at.slice(0, 10) === candidate.item.at.slice(0, 10)
      && sameFollowUpLine(entry.detail, candidate.item),
    )
    if (!match) return entry
    match.used = true
    return { ...entry, detail: followUpActivityDetail(match.item) }
  })
}

function event(id: string, at: string, title: string, detail: string): InvoiceEvent {
  return { id, at, title, detail }
}

/** Build a timeline from seeded fields when history has not been written yet. */
export function synthesizeActivity(invoice: Invoice): InvoiceEvent[] {
  const entries: InvoiceEvent[] = []

  for (const [index, followUp] of invoice.followUps.entries()) {
    entries.push(event(
      `${invoice.id}-fu-${index}`,
      followUp.at,
      'Follow-up recorded',
      followUpActivityDetail(followUp),
    ))
  }

  for (const [index, payment] of invoice.payments.entries()) {
    entries.push(event(
      `${invoice.id}-pay-${index}`,
      payment.at,
      'Payment received',
      `${payment.amount} · ${payment.note}`,
    ))
  }

  if (invoice.promise) {
    entries.push(event(
      `${invoice.id}-promise`,
      invoice.promise.recordedAt,
      'Promise recorded',
      `Due ${invoice.promise.dueDate} · ${invoice.promise.note}`,
    ))
  }

  if (invoice.dispute) {
    entries.push(event(
      `${invoice.id}-dispute`,
      invoice.dueDate,
      invoice.dispute.status === 'open' ? 'Dispute opened' : 'Dispute updated',
      invoice.dispute.reason,
    ))
  }

  if (invoice.resolved) {
    entries.push(event(
      `${invoice.id}-resolved`,
      invoice.resolved.at,
      'Resolved (not paid)',
      `${invoice.resolved.reason} · ${invoice.resolved.note}`,
    ))
  }

  return entries
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, historyLimit)
}

/** Newest-first activity for the drawer. Prefer recorded history; else synthesize. */
export function activityTimeline(invoice: Invoice): InvoiceEvent[] {
  const events = invoice.history && invoice.history.length > 0
    ? [...invoice.history]
    : synthesizeActivity(invoice)
  return stampFollowUpOutcomes(invoice, events)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, historyLimit)
}
