import {
  demoDay,
  historyLimit,
  invoiceKey,
  type Change,
  type Invoice,
  type InvoiceEvent,
  type ResolutionReason,
} from './model.ts'
import { availableActions } from './lifecycle.ts'
import { inActiveQueue, remaining, validDate } from './rules.ts'

const resolutionReasons: ResolutionReason[] = ['dispute_closed', 'credit_issued', 'other']

function recordEvent(invoice: Invoice, title: string, detail = ''): Invoice {
  const event: InvoiceEvent = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    title,
    detail: detail.length > 240 ? `${detail.slice(0, 239)}…` : detail,
  }
  return { ...invoice, history: [event, ...(invoice.history ?? [])].slice(0, historyLimit) }
}

export function applyChange(invoices: Invoice[], key: string, change: Change) {
  const invoice = invoices.find(item => invoiceKey(item) === key)
  if (!invoice) return { invoices, errors: { form: 'Invoice not found.' } }
if (!inActiveQueue(invoice)) {
    return { invoices, errors: { form: 'Invoice is out of the active queue.' } }
  }
  if (!availableActions(invoice).includes(change.type)) {
    return { invoices, errors: { form: 'This action is not available for the current invoice state.' } }
  }

  const errors: Record<string, string> = {}
  let next = invoice

  switch (change.type) {
    case 'follow-up': {
      const note = change.value.note.trim()
      const channel = change.value.channel.trim() || 'Email'
      if (!note) errors.note = 'Describe the follow-up.'
      if (!channel) errors.channel = 'Enter a channel.'
      next = {
        ...invoice,
        followUps: [
          { at: demoDay, note, channel, answered: Boolean(change.value.answered) },
          ...invoice.followUps,
        ],
      }
      next = recordEvent(next, 'Follow-up recorded', `${channel} · ${note}`)
      break
    }
    case 'promise': {
      const note = change.value.note.trim()
      const dueDate = change.value.dueDate
      if (!note) errors.note = 'Describe the promise.'
      if (!validDate(dueDate)) errors.dueDate = 'Enter a valid promise date.'
      next = {
        ...invoice,
        promise: { dueDate, note, recordedAt: demoDay },
      }
      next = recordEvent(next, 'Promise recorded', `Due ${dueDate} · ${note}`)
      break
    }
    case 'payment': {
      const note = change.value.note.trim()
      const amount = change.value.amount
      const left = remaining(invoice)
      if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter a payment greater than zero.'
      else if (amount > left) errors.amount = `Amount cannot exceed Remaining (${left}).`
      if (!note) errors.note = 'Add a short payment note.'
      next = {
        ...invoice,
        payments: [...invoice.payments, { at: demoDay, amount, note }],
        promise: amount >= left ? undefined : invoice.promise,
      }
      next = recordEvent(next, 'Payment received', `${amount} · ${note}`)
      break
    }
    case 'resolve': {
      const note = change.value.note.trim()
      const reason = change.value.reason
      if (!resolutionReasons.includes(reason)) errors.reason = 'Choose a ResolutionReason.'
      if (!note) errors.note = 'Add a short resolve note.'
      next = {
        ...invoice,
        resolved: { reason, note, at: demoDay },
      }
      next = recordEvent(next, 'Resolved (not paid)', `${reason} · ${note}`)
      break
    }
    case 'dispute': {
      const reason = change.value.reason.trim()
      const evidence = change.value.evidence.trim()
      if (!reason) errors.reason = 'Describe the dispute.'
      if (change.value.status !== 'open' && change.value.status !== 'resolved') {
        errors.status = 'Choose open or resolved.'
      }
      next = {
        ...invoice,
        dispute: { reason, evidence, status: change.value.status },
      }
      next = recordEvent(next, change.value.status === 'open' ? 'Dispute opened' : 'Dispute updated', reason)
      break
    }
    case 'route-am': {
      const note = change.value.note.trim()
      if (!note) errors.note = 'Describe the next action for the account manager.'
      next = {
        ...invoice,
        ownerRole: 'account_manager',
      }
      next = recordEvent(next, 'Routed to AM (simulation)', note)
      break
    }
    case 'verify-accuracy': {
      const note = change.value.note.trim()
      if (!note) errors.note = 'Note what was verified.'
      next = {
        ...invoice,
        invoiceAccuracy: 'ok',
      }
      next = recordEvent(next, 'InvoiceAccuracy verified', note)
      break
    }
    default: {
      const _exhaustive: never = change
      return { invoices, errors: { form: `Unknown change: ${JSON.stringify(_exhaustive)}` } }
    }
  }

  if (Object.keys(errors).length) return { invoices, errors }
  return {
    invoices: invoices.map(item => item === invoice ? next : item),
    errors,
  }
}
