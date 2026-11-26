import { describe, expect, it } from 'vitest'
import { applyChange } from './apply-change.ts'
import {
  demoDay,
  inActiveQueue,
  priorityTier,
  promiseStatus,
  remaining,
  settlement,
  totalFollowUps,
  totalPayments,
  type Invoice,
} from './index.ts'
import { seed, seedInvoiceIds } from './seed.ts'

const byCode = (invoices: Invoice[], code: string) => invoices.find(item => item.code === code)!

describe('applyChange follow-up and promise (#3)', () => {
  it('rejects empty follow-up note and records a valid follow-up without counting as cash', () => {
    const invoices = seed()
    const rejected = applyChange(invoices, seedInvoiceIds.Brook, {
      type: 'follow-up',
      value: { note: '  ', channel: 'Email', answered: false },
    })
    expect(rejected.errors).toHaveProperty('note')
    expect(rejected.invoices).toBe(invoices)

    const { invoices: next, errors } = applyChange(invoices, seedInvoiceIds.Brook, {
      type: 'follow-up',
      value: { note: 'Left voicemail with AP.', channel: 'Phone', answered: false },
    })
    expect(errors).toEqual({})
    expect(byCode(next, 'Brook').followUps).toHaveLength(1)
    expect(totalPayments(next)).toBe(0)
    expect(totalFollowUps(next)).toBe(totalFollowUps(invoices) + 1)
    expect(settlement(byCode(next, 'Brook'))).toBe('open')
  })

  it('keeps Crest active and Dune broken after dated promises', () => {
    let invoices = seed()
    expect(promiseStatus(byCode(invoices, 'Crest'))).toBe('active')
    expect(promiseStatus(byCode(invoices, 'Dune'))).toBe('broken')
    expect(priorityTier(byCode(invoices, 'Crest'))).toBe('P2')
    expect(priorityTier(byCode(invoices, 'Dune'))).toBe('P0')

    const bad = applyChange(invoices, seedInvoiceIds.Brook, {
      type: 'promise',
      value: { dueDate: 'not-a-date', note: 'Will pay' },
    })
    expect(bad.errors).toHaveProperty('dueDate')

    invoices = applyChange(invoices, seedInvoiceIds.Brook, {
      type: 'promise',
      value: { dueDate: '2026-11-28', note: 'AP committed Friday.' },
    }).invoices
    expect(promiseStatus(byCode(invoices, 'Brook'))).toBe('active')
    expect(priorityTier(byCode(invoices, 'Brook'))).toBe('P2')
    expect(settlement(byCode(invoices, 'Brook'))).toBe('open')
    expect(promiseStatus(byCode(invoices, 'Crest'))).toBe('active')
    expect(promiseStatus(byCode(invoices, 'Dune'))).toBe('broken')
  })
})

describe('applyChange payment (#4)', () => {
  it('accepts partial and full payment; paid leaves queue; payments are cash not slots', () => {
    let invoices = seed()
    const over = applyChange(invoices, seedInvoiceIds.Brook, {
      type: 'payment',
      value: { amount: 5000, note: 'Too much' },
    })
    expect(over.errors).toHaveProperty('amount')

    invoices = applyChange(invoices, seedInvoiceIds.Brook, {
      type: 'payment',
      value: { amount: 800, note: 'Partial wire' },
    }).invoices
    expect(remaining(byCode(invoices, 'Brook'))).toBe(1000)
    expect(settlement(byCode(invoices, 'Brook'))).toBe('partial')
    expect(inActiveQueue(byCode(invoices, 'Brook'))).toBe(true)
    expect(totalPayments(invoices)).toBe(800)

    invoices = applyChange(invoices, seedInvoiceIds.Brook, {
      type: 'payment',
      value: { amount: 1000, note: 'Remainder' },
    }).invoices
    expect(remaining(byCode(invoices, 'Brook'))).toBe(0)
    expect(settlement(byCode(invoices, 'Brook'))).toBe('paid')
    expect(inActiveQueue(byCode(invoices, 'Brook'))).toBe(false)
    expect(priorityTier(byCode(invoices, 'Brook'))).toBe('P3')
    expect(totalPayments(invoices)).toBe(1800)
  })
})

describe('applyChange resolve (#5)', () => {
  it('requires reason and note; leaves queue without cash', () => {
    const invoices = seed()
    expect(applyChange(invoices, seedInvoiceIds.Aster, {
      type: 'resolve',
      value: { reason: 'dispute_closed', note: '' },
    }).errors).toHaveProperty('note')

    const beforeCash = totalPayments(invoices)
    const { invoices: next, errors } = applyChange(invoices, seedInvoiceIds.Aster, {
      type: 'resolve',
      value: { reason: 'dispute_closed', note: 'Quantity dispute closed commercially.' },
    })
    expect(errors).toEqual({})
    expect(inActiveQueue(byCode(next, 'Aster'))).toBe(false)
    expect(settlement(byCode(next, 'Aster'))).toBe('open')
    expect(totalPayments(next)).toBe(beforeCash)
    expect(byCode(next, 'Aster').resolved?.reason).toBe('dispute_closed')
  })
})

describe('applyChange dispute, AM route, verify (#6)', () => {
  it('opens a dispute on Brook so Aster≠Brook paths diverge', () => {
    const invoices = applyChange(seed(), seedInvoiceIds.Brook, {
      type: 'dispute',
      value: { reason: 'Price mismatch', evidence: 'PO note', status: 'open' },
    }).invoices
    expect(priorityTier(byCode(invoices, 'Brook'))).toBe('P1')
    expect(priorityTier(byCode(invoices, 'Aster'))).toBe('P1')
  })

  it('routes to AM as labeled ownership change', () => {
    const { invoices, errors } = applyChange(seed(), seedInvoiceIds.East, {
      type: 'route-am',
      value: { note: 'Hand off unanswered reminders (simulation).' },
    })
    expect(errors).toEqual({})
    expect(byCode(invoices, 'East').ownerRole).toBe('account_manager')
  })

  it('verifies Grove invoice accuracy', () => {
    const { invoices, errors } = applyChange(seed(), seedInvoiceIds.Grove, {
      type: 'verify-accuracy',
      value: { note: 'Bank details confirmed with AP.' },
    })
    expect(errors).toEqual({})
    expect(byCode(invoices, 'Grove').invoiceAccuracy).toBe('ok')
  })
})
