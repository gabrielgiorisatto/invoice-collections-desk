import type { Invoice, InvoiceEvent } from './model.ts'
import { historyLimit } from './model.ts'

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
      `${followUp.channel} · ${followUp.note}`,
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
  if (invoice.history && invoice.history.length > 0) {
    return [...invoice.history].sort((a, b) => b.at.localeCompare(a.at))
  }
  return synthesizeActivity(invoice)
}
