import { describe, expect, it } from 'vitest'
import { applyChange } from './apply-change.ts'
import { calendarMarks, calendarMonth, calendarSummary, marksOn, monthAgenda } from './calendar.ts'
import { demoDay } from './model.ts'
import { seed, seedInvoiceIds } from './seed.ts'

describe('desk calendar', () => {
  it('shows the month that contains the demo day, and any other month', () => {
    const month = calendarMonth()
    expect(month.key).toBe('2026-11')
    expect(month.label).toBe('November 2026')
    expect(month.weeks[0]?.[0]).toBe('2026-11-01')
    expect(month.weeks.every(week => week.length === 7)).toBe(true)

    const earlier = calendarMonth('2024-02-15')
    expect(earlier.key).toBe('2024-02')
    expect(earlier.label).toBe('February 2024')
    expect(earlier.weeks.every(week => week.length === 7)).toBe(true)
    expect(earlier.weeks.flat().filter(Boolean)).toHaveLength(29)
  })

  it('marks activity, invoice due dates, and promise dates', () => {
    const marks = calendarMarks(seed())
    const titles = new Set(marks.map(mark => mark.title))
    expect(titles.has('Follow-up recorded')).toBe(true)
    expect(titles.has('Promise recorded')).toBe(true)
    expect(titles.has('Dispute opened')).toBe(true)
    expect(titles.has('Invoice due')).toBe(true)
    expect(titles.has('Promise due')).toBe(true)
    expect(marks.find(mark => mark.title === 'Invoice due')?.kind).toBe('due')
    expect(marks.find(mark => mark.title === 'Promise due')?.kind).toBe('promise')
    expect(marks.find(mark => mark.title === 'Follow-up recorded')?.kind).toBe('activity')
    expect(marks.find(mark => mark.title === 'Promise recorded')?.kind).toBe('activity')

    const paid = applyChange(seed(), seedInvoiceIds.Brook, {
      type: 'payment',
      value: { amount: 100, note: 'Wire' },
    })
    const payment = calendarMarks(paid.invoices).find(mark => mark.code === 'Brook' && mark.title === 'Payment received')
    expect(payment?.kind).toBe('payment')
    expect(payment?.date).toBe(demoDay)
    expect(payment?.detail).toContain('Wire')

    const brook = seed().find(invoice => invoice.code === 'Brook')!
    expect(marksOn(marks, brook.dueDate).some(mark => mark.code === 'Brook' && mark.title === 'Invoice due')).toBe(true)

    const aster = seed().find(invoice => invoice.code === 'Aster')!
    const asterDay = marksOn(marks, aster.dueDate).filter(mark => mark.code === 'Aster').map(mark => mark.title)
    expect(asterDay).toContain('Invoice due')
    expect(asterDay).toContain('Dispute opened')

    const crest = seed().find(invoice => invoice.code === 'Crest')!
    const promiseDue = marksOn(marks, crest.promise!.dueDate).find(mark => mark.code === 'Crest' && mark.title === 'Promise due')
    expect(calendarSummary(promiseDue!)).toMatch(/^Crest · Promise due · /)
    expect(marksOn(marks, crest.promise!.recordedAt).map(mark => mark.title)).toContain('Promise recorded')
    const followUp = marksOn(marks, crest.followUps[0]!.at).find(mark => mark.code === 'Crest' && mark.title === 'Follow-up recorded')!
    expect(calendarSummary(followUp)).toMatch(/^Crest · Follow-up recorded · /)

    const flagged = applyChange(seed(), seedInvoiceIds.Brook, {
      type: 'flag-details',
      value: { note: 'Remittance details look off.' },
    })
    const onDemoDay = marksOn(calendarMarks(flagged.invoices), demoDay)
    expect(onDemoDay.map(mark => mark.title)).toContain('Details flagged for review')
    expect(calendarSummary(onDemoDay.find(mark => mark.code === 'Brook' && mark.title === 'Details flagged for review')!)).toMatch(/Details flagged for review/)
  })

  it('groups this month by day, with due and promise before activity', () => {
    const groups = monthAgenda(seed())
    const dates = groups.map(group => group.date)
    expect(dates).toEqual([...dates].sort())
    expect(dates.every(date => date.startsWith('2026-11'))).toBe(true)

    const east = seed().find(invoice => invoice.code === 'East')!
    expect(east.dueDate.startsWith('2026-11')).toBe(false)
    expect(calendarMarks(seed()).some(mark => mark.code === 'East' && mark.date === east.dueDate && mark.title === 'Invoice due')).toBe(true)
    expect(groups.some(group => group.date === east.dueDate)).toBe(false)

    const brook = seed().find(invoice => invoice.code === 'Brook')!
    expect(groups.find(group => group.date === brook.dueDate)?.marks.some(mark => mark.title === 'Invoice due' && mark.code === 'Brook')).toBe(true)

    const dune = seed().find(invoice => invoice.code === 'Dune')!
    const grove = seed().find(invoice => invoice.code === 'Grove')!
    expect(dune.promise!.dueDate).toBe(grove.dueDate)
    const shared = groups.find(group => group.date === grove.dueDate)!
    expect(shared.marks.map(mark => mark.title)).toEqual(['Invoice due', 'Promise due'])

    const october = monthAgenda(seed(), '2026-10-01')
    expect(october.every(group => group.date.startsWith('2026-10'))).toBe(true)
    expect(october.some(group => group.marks.some(mark => mark.code === 'Aster' && mark.kind === 'due'))).toBe(true)
    expect(october.some(group => group.date === brook.dueDate)).toBe(false)
  })
})
