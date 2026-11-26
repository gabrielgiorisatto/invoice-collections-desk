import { describe, expect, it } from 'vitest'
import { applyChange } from './apply-change.ts'
import {
  deskEmptyCopy,
  deskQueueView,
  visibleQueue,
  type DeskQueueView,
} from './desk-view.ts'
import { filterByDueWindow } from './date-filter.ts'
import type { Invoice } from './model.ts'
import { remaining } from './rules.ts'
import { emptyQueueFilters, type QueueFilters } from './queue-query.ts'
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
      cause: 'due-window',
      filters: emptyQueueFilters,
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
    expect(filtered.map(item => item.code)).toEqual(['Grove'])
    const view = deskQueueView(paidGrove, filtered, 'last-7-days')
    expect(view).toEqual({
      kind: 'filter-no-match',
      preset: 'last-7-days',
      cause: 'due-window',
      filters: emptyQueueFilters,
    } satisfies DeskQueueView)
  })

  it('is filter-no-match from queue facets when the due window still has work', () => {
    const session = seed()
    const filtered = filterByDueWindow(session, 'all-time')
    const facets: QueueFilters = { ...emptyQueueFilters, status: 'open', promise: 'broken' }
    const view = deskQueueView(session, filtered, 'all-time', facets)
    expect(view).toEqual({
      kind: 'filter-no-match',
      preset: 'all-time',
      cause: 'queue-filters',
      filters: facets,
    } satisfies DeskQueueView)
  })

  it('applies due window then queue facets together', () => {
    const session = seed()
    const filtered = filterByDueWindow(session, 'this-month')
    const facets: QueueFilters = { ...emptyQueueFilters, priority: 'high' }
    const view = deskQueueView(session, filtered, 'this-month', facets)
    expect(view.kind).toBe('ready')
    if (view.kind === 'ready') {
      expect(view.active.map(item => item.code).sort()).toEqual(['Brook', 'Grove'])
    }
  })
})

describe('visibleQueue', () => {
  it('hides paid and resolved invoices until show paid is on', () => {
    let session = payInFull(seed(), seedInvoiceIds.Brook)
    session = applyChange(session, seedInvoiceIds.Crest, {
      type: 'resolve',
      value: { reason: 'other', note: 'Written off for demo' },
    }).invoices
    const filtered = filterByDueWindow(session, 'all-time')
    const view = deskQueueView(session, filtered, 'all-time')
    const hidden = visibleQueue(view, filtered, emptyQueueFilters, false).map(item => item.code)
    expect(hidden).not.toContain('Brook')
    expect(hidden).not.toContain('Crest')
    const shown = visibleQueue(view, filtered, emptyQueueFilters, true).map(item => item.code)
    expect(shown).toContain('Brook')
    expect(shown).toContain('Crest')
  })

  it('shows the settled book when the queue is cleared and show paid is on', () => {
    const session = clearAllByPayment(seed())
    const filtered = filterByDueWindow(session, 'all-time')
    const view = deskQueueView(session, filtered, 'all-time')
    expect(visibleQueue(view, filtered, emptyQueueFilters, false)).toHaveLength(0)
    expect(visibleQueue(view, filtered, emptyQueueFilters, true)).toHaveLength(6)
  })

  it('still hides a paid invoice that misses an active status filter', () => {
    const session = payInFull(seed(), seedInvoiceIds.Brook)
    const filtered = filterByDueWindow(session, 'all-time')
    const filters: QueueFilters = { ...emptyQueueFilters, status: 'open' }
    const view = deskQueueView(session, filtered, 'all-time', filters)
    const shown = visibleQueue(view, filtered, filters, true).map(item => item.code)
    expect(shown).not.toContain('Brook')
  })
})

describe('deskEmptyCopy', () => {
  it('explains filter no-match with the preset label', () => {
    const copy = deskEmptyCopy({
      kind: 'filter-no-match',
      preset: 'last-day',
      cause: 'due-window',
      filters: emptyQueueFilters,
    })
    expect(copy.title).toBe('No invoices in this due window')
    expect(copy.description).toMatch(/Last day/)
    expect(copy.actionLabel).toBe('Show all time')
    expect(copy.action).toBe('show-all-time')
  })

  it('explains facet no-match with Clear filters', () => {
    const copy = deskEmptyCopy({
      kind: 'filter-no-match',
      preset: 'all-time',
      cause: 'queue-filters',
      filters: { ...emptyQueueFilters, status: 'open', promise: 'broken' },
    })
    expect(copy.title).toBe('No invoices match these filters')
    expect(copy.actionLabel).toBe('Clear filters')
    expect(copy.action).toBe('clear-filters')
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
