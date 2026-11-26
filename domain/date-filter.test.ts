import { describe, expect, it } from 'vitest'
import {
  filterByDueWindow,
  matchesDueWindow,
  openRemainingTotal,
  paidTotal,
  shiftDay,
} from './date-filter.ts'
import { applyChange } from './apply-change.ts'
import { demoDay, type Invoice } from './model.ts'
import { seed, seedInvoiceIds } from './seed.ts'

const byCode = (invoices: Invoice[], code: string) => invoices.find(item => item.code === code)!

describe('due-date filter presets', () => {
  it('defaults conceptually to all-time (every seed invoice)', () => {
    expect(filterByDueWindow(seed(), 'all-time')).toHaveLength(6)
  })

  it('last 7 days includes Grove (due within window) and excludes Brook', () => {
    const codes = filterByDueWindow(seed(), 'last-7-days').map(item => item.code)
    expect(codes).toContain('Grove')
    expect(codes).not.toContain('Brook')
  })

  it('this month includes November dues only', () => {
    const codes = filterByDueWindow(seed(), 'this-month').map(item => item.code).sort()
    expect(codes).toEqual(['Brook', 'Crest', 'Grove'])
  })

  it('this year includes all seed invoices in 2026', () => {
    expect(filterByDueWindow(seed(), 'this-year')).toHaveLength(6)
  })

  it('last day uses [demoDay-1, demoDay]', () => {
    const start = shiftDay(demoDay, -1)
    expect(matchesDueWindow({ ...byCode(seed(), 'Grove'), dueDate: demoDay }, 'last-day')).toBe(true)
    expect(matchesDueWindow({ ...byCode(seed(), 'Grove'), dueDate: start }, 'last-day')).toBe(true)
    expect(matchesDueWindow(byCode(seed(), 'Grove'), 'last-day')).toBe(false)
  })

  it('openRemainingTotal and paidTotal respect the filtered set', () => {
    const paid = applyChange(seed(), seedInvoiceIds.Brook, {
      type: 'payment',
      value: { amount: 1800, note: 'Paid in full' },
    }).invoices
    const month = filterByDueWindow(paid, 'this-month')
    expect(paidTotal(month)).toBe(1800)
    expect(openRemainingTotal(month)).toBeGreaterThan(0)
    expect(openRemainingTotal(month)).toBeLessThan(openRemainingTotal(paid))
  })
})
