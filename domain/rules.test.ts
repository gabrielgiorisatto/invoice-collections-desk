import { describe, expect, it } from 'vitest'
import { demoDay, morningCapacity, priorityTier, todaysThree, type Invoice } from './index.ts'
import { seed, seedInvoiceIds } from './seed.ts'

const byCode = (invoices: Invoice[], code: string) => invoices.find(item => item.code === code)!

describe('priority tiers and Today’s 3', () => {
  it('assigns seed invoices to explainable tiers (not scores)', () => {
    const invoices = seed()
    expect(priorityTier(byCode(invoices, 'Dune'))).toBe('P0')
    expect(priorityTier(byCode(invoices, 'Brook'))).toBe('P0')
    expect(priorityTier(byCode(invoices, 'Grove'))).toBe('P0')
    expect(priorityTier(byCode(invoices, 'East'))).toBe('P1')
    expect(priorityTier(byCode(invoices, 'Aster'))).toBe('P1')
    expect(priorityTier(byCode(invoices, 'Crest'))).toBe('P2')
  })

  it('fills Today’s 3 from P0 in fixed order: broken → never contacted → unverified', () => {
    const picks = todaysThree(seed())
    expect(picks.map(invoice => invoice.code)).toEqual(['Dune', 'Brook', 'Grove'])
    expect(picks).toHaveLength(morningCapacity)
    expect(picks.every(invoice => priorityTier(invoice) === 'P0')).toBe(true)
  })

  it('backfills Today’s 3 from P1 only when P0 is exhausted', () => {
    const invoices = seed().filter(invoice => !['Dune', 'Brook', 'Grove'].includes(invoice.code))
    const picks = todaysThree(invoices)
    // Tie-break within P1: larger Remaining then more overdue (ADR-0001) → Aster before East
    expect(picks.map(invoice => invoice.code)).toEqual(['Aster', 'East'])
    expect(picks.every(invoice => priorityTier(invoice) === 'P1')).toBe(true)
  })

  it('never auto-picks active promises while P0 or P1 remain', () => {
    const picks = todaysThree(seed())
    expect(picks.map(invoice => invoice.code)).not.toContain('Crest')
    expect(picks.map(invoice => invoice.id)).not.toContain(seedInvoiceIds.Crest)
  })
})

describe('P3 settled invoices', () => {
  it('assigns Remaining = 0 to P3 and excludes them from Today’s 3', () => {
    const invoices = seed().map(invoice =>
      invoice.code === 'Brook'
        ? { ...invoice, payments: [{ at: demoDay, amount: invoice.amount, note: 'Paid in full' }] }
        : invoice,
    )
    expect(priorityTier(byCode(invoices, 'Brook'))).toBe('P3')
    expect(todaysThree(invoices).map(invoice => invoice.code)).toEqual(['Dune', 'Grove', 'Aster'])
  })
})
