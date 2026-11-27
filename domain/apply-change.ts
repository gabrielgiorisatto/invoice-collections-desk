import {
  demoDay,
  historyLimit,
  invoiceKey,
  type Change,
  type Invoice,
  type InvoiceEvent,
  type ResolutionReason,
} from './model.ts'
import { followUpActivityDetail, synthesizeActivity } from './activity.ts'
import { availableActions } from './lifecycle.ts'
import { disputeStatus, inActiveQueue, remaining, validDate } from './rules.ts'

const resolutionReasons: ResolutionReason[] = ['dispute_closed', 'credit_issued', 'other']

const resolutionLabels: Record<ResolutionReason, string> = {
  dispute_closed: 'Dispute closed',
  credit_issued: 'Credit issued',
  other: 'Other',
}

/** Prepend an activity entry. Prior timeline comes from `base` (pre-change) so new fields are not double-counted. */
function recordEvent(base: Invoice, mutated: Invoice, title: string, detail = ''): Invoice {
  const event: InvoiceEvent = {
    id: crypto.randomUUID(),
    at: demoDay,
    title,
    detail: detail.length > 240 ? `${detail.slice(0, 239)}…` : detail,
  }
  const prior = base.history ?? synthesizeActivity(base)
  return { ...mutated, history: [event, ...prior].slice(0, historyLimit) }
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
      const answered = Boolean(change.value.answered)
      if (!note) errors.note = 'Describe the follow-up.'
      if (!channel) errors.channel = 'Enter a channel.'
      next = {
        ...invoice,
        followUps: [
          { at: demoDay, note, channel, answered },
          ...invoice.followUps,
        ],
      }
      next = recordEvent(invoice, next, 'Follow-up recorded', followUpActivityDetail({ channel, note, answered }))
      break
    }
    case 'promise': {
      const note = change.value.note.trim()
      const dueDate = change.value.dueDate
      if (!note) errors.note = 'Describe the promise.'
      if (!validDate(dueDate)) errors.dueDate = 'Enter a valid promise date.'
      const existing = invoice.promise
      next = {
        ...invoice,
        promise: { dueDate, note, recordedAt: demoDay },
      }
      const detail = existing
        ? `Was due ${existing.dueDate}; now due ${dueDate} · ${note}`
        : `Due ${dueDate} · ${note}`
      next = recordEvent(invoice, next, existing ? 'Promise updated' : 'Promise recorded', detail)
      break
    }
    case 'cancel-promise': {
      const note = change.value.note.trim()
      if (!invoice.promise) errors.form = 'No promise to cancel.'
      if (!note) errors.note = 'Note why the promise is cancelled.'
      const due = invoice.promise?.dueDate ?? ''
      const withoutPromise: Invoice = { ...invoice }
      delete withoutPromise.promise
      next = recordEvent(invoice, withoutPromise, 'Promise cancelled', `Due ${due} · ${note}`)
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
      next = recordEvent(invoice, next, 'Payment received', `${amount} · ${note}`)
      break
    }
    case 'resolve': {
      const note = change.value.note.trim()
      const reason = change.value.reason
      if (!resolutionReasons.includes(reason)) errors.reason = 'Choose a resolution reason.'
      if (!note) errors.note = 'Add a short resolve note.'
      next = {
        ...invoice,
        resolved: { reason, note, at: demoDay },
      }
      next = recordEvent(invoice, next, 'Resolved (not paid)', `${resolutionLabels[reason]} · ${note}`)
      break
    }
    case 'dispute': {
      const reason = change.value.reason.trim()
      const evidence = change.value.evidence.trim()
      if (!reason) errors.reason = 'Describe the dispute.'
      if (change.value.status !== 'open') {
        errors.status = 'Open or update the one dispute here. Cancel it to close it.'
      }
      const open = disputeStatus(invoice) === 'open'
      next = {
        ...invoice,
        dispute: { reason, evidence, status: 'open' },
      }
      next = recordEvent(invoice, next, open ? 'Dispute updated' : 'Dispute opened', reason)
      break
    }
    case 'cancel-dispute': {
      const note = change.value.note.trim()
      if (disputeStatus(invoice) !== 'open' || !invoice.dispute) errors.form = 'No open dispute to cancel.'
      if (!note) errors.note = 'Note why the dispute is cancelled.'
      const reason = invoice.dispute?.reason ?? ''
      next = {
        ...invoice,
        dispute: {
          reason,
          evidence: invoice.dispute?.evidence ?? '',
          status: 'resolved',
        },
      }
      next = recordEvent(invoice, next, 'Dispute cancelled', note)
      break
    }
    case 'route-am': {
      const note = change.value.note.trim()
      if (!note) errors.note = 'Describe the next action for the account manager.'
      next = {
        ...invoice,
        ownerRole: 'account_manager',
      }
      next = recordEvent(invoice, next, 'Routed to AM (simulation)', note)
      break
    }
    case 'flag-details': {
      const note = change.value.note.trim()
      if (!note) errors.note = 'Note what needs review.'
      next = {
        ...invoice,
        invoiceAccuracy: 'unverified_claim',
      }
      next = recordEvent(invoice, next, 'Details flagged for review', note)
      break
    }
    case 'confirm-details': {
      const note = change.value.note.trim()
      if (!note) errors.note = 'Note what was verified.'
      next = {
        ...invoice,
        invoiceAccuracy: 'ok',
      }
      next = recordEvent(invoice, next, 'Details confirmed verified', note)
      break
    }
    case 'cancel-details': {
      const note = change.value.note.trim()
      if (invoice.invoiceAccuracy !== 'unverified_claim') errors.form = 'No open details request to cancel.'
      if (!note) errors.note = 'Note why the details request is cancelled.'
      next = {
        ...invoice,
        invoiceAccuracy: 'ok',
      }
      next = recordEvent(invoice, next, 'Details request cancelled', note)
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
