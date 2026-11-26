import { describe, expect, it } from 'vitest'
import { applyChange } from './apply-change.ts'
import {
  deskEmptyCopy,
  deskQueueView,
  type DeskQueueView,
} from './desk-view.ts'
import { filterByDueWindow } from './date-filter.ts'
import type { Invoice } from './model.ts'
import { remaining } from './rules.ts'
import { seed, seedInvoiceIds } from './seed.ts'

function payInFull(invoices: Invoice[], id: string, note = 'Paid in full'): Invoice[] {
  const invoice = invoices.find(item => item.id === id)!
  return applyChange(invoices, id, {
    type: 'payment',
    value: { amount: remaining(invoice), note },
  }).invoices
}

function clearAllByPayment(invoices: Invoice[]): Invoice[] {
  let next = invoices
  for (const invoice of [...next]) {
    if (remaining(invoice) <= 0) continue
    next = payInFull(next, invoice.id, 'Cleared')
  }
  return next
}

/** Resolve where lifecycle allows it; pay the rest so the session can clear. */
function clearViaResolveAndPay(invoices: Invoice[]): Invoice[] {
  let next = invoices
  // Aster (open dispute) and Crest (active promise) allow Resolve.
  for (const id of [seedInvoiceIds.Aster, seedInvoiceIds.Crest]) {
    next = applyChange(next, id, {
      type: 'resolve',
      value: { reason: 'other', note: 'Written off for demo' },
    }).invoices
  }
  return clearAllByPayment(next)
}

describe('deskQueueView', () => {
  it('is ready when the due window has active invoices', () => {
    const session = seed()
    const filtered = filterByDueWindow(session, 'all-time')
    const view = deskQueueView(session, filtered, 'all-time')
    expect(view.kind).toBe('ready')
    if (view.kind === 'ready') {
      expect(view.active).toHaveLength(6)
      expect(view.active.every(item => remaining(item) > 0)).toBe(true)
    }
  })

  it('is filter-no-match when the due window matches nothing but the session still has work', () => {
    const session = seed()
    const filtered = filterByDueWindow(session, 'last-day')
    expect(filtered).toHaveLength(0)
    const view = deskQueueView(session, filtered, 'last-day')
    expect(view).toEqual({
      kind: 'filter-no-match',
      preset: 'last-day',
    } satisfies DeskQueueView)
  })

  it('is all-cleared after every invoice is paid (pay path)', () => {
    const session = clearAllByPayment(seed())
    const filtered = filterByDueWindow(session, 'all-time')
    const view = deskQueueView(session, filtered, 'all-time')
    expect(view.kind).toBe('all-cleared')
    if (view.kind === 'all-cleared') {
      expect(view.settled).toHaveLength(6)
    }
  })

  it('is all-cleared after resolve + pay leave nothing active (resolve path)', () => {
    const session = clearViaResolveAndPay(seed())
    const filtered = filterByDueWindow(session, 'all-time')
    const view = deskQueueView(session, filtered, 'all-time')
    expect(view.kind).toBe('all-cleared')
    if (view.kind === 'all-cleared') {
      expect(view.settled.find(item => item.code === 'Aster')?.resolved).toBeTruthy()
      expect(view.settled.find(item => item.code === 'Crest')?.resolved).toBeTruthy()
    }
  })

  it('prefers all-cleared over filter-no-match when the whole session is done', () => {
    const session = clearAllByPayment(seed())
    const filtered = filterByDueWindow(session, 'last-day')
    const view = deskQueueView(session, filtered, 'last-day')
    expect(view.kind).toBe('all-cleared')
  })

  it('is filter-no-match when the window only has settled invoices but other work remains', () => {
    const paidGrove = payInFull(seed(), seedInvoiceIds.Grove, 'Paid Grove')
    const filtered = filterByDueWindow(paidGrove, 'last-7-days')
    // Grove is the only seed in last-7-days; once paid, window has no active work.
    expect(filtered.map(item => item.code)).toEqual(['Grove'])
    const view = deskQueueView(paidGrove, filtered, 'last-7-days')
    expect(view).toEqual({
      kind: 'filter-no-match',
      preset: 'last-7-days',
    } satisfies DeskQueueView)
  })
})

describe('deskEmptyCopy', () => {
  it('explains filter no-match with the preset label', () => {
    const copy = deskEmptyCopy({ kind: 'filter-no-match', preset: 'last-day' })
    expect(copy.title).toBe('No invoices in this due window')
    expect(copy.description).toMatch(/Last day/)
    expect(copy.actionLabel).toBe('Show all time')
  })

  it('celebrates an all-cleared queue after pay/resolve', () => {
    const copy = deskEmptyCopy({
      kind: 'all-cleared',
      settled: clearAllByPayment(seed()),
    })
    expect(copy.title).toBe('Queue cleared')
    expect(copy.description).toMatch(/paid or resolved/i)
    expect(copy.actionLabel).toBeUndefined()
  })
})
