import { describe, expect, it } from 'vitest'
import { applyChange } from './apply-change.ts'
import { calendarMarks, calendarMonths, calendarSummary, marksOn } from './calendar.ts'
import { demoDay } from './model.ts'
import { seed, seedInvoiceIds } from './seed.ts'

describe('desk calendar', () => {
  it('shows last month, this month, and next month around the demo day', () => {
    const months = calendarMonths()
    expect(months.map(month => month.key)).toEqual(['2026-10', '2026-11', '2026-12'])
    expect(months.map(month => month.label)).toEqual(['October 2026', 'November 2026', 'December 2026'])
    expect(months[1]?.weeks[0]?.[0]).toBe('2026-11-01')
    expect(months.every(month => month.weeks.every(week => week.length === 7))).toBe(true)
  })

  it('places every activity record, not only due, promise, payment, and follow-up', () => {
    const marks = calendarMarks(seed())
    const titles = new Set(marks.map(mark => mark.title))
    expect(titles.has('Follow-up recorded')).toBe(true)
    expect(titles.has('Promise recorded')).toBe(true)
    expect(titles.has('Dispute opened')).toBe(true)
    expect(marks.some(mark => mark.title === 'Due')).toBe(false)

    const brookDue = seed().find(invoice => invoice.code === 'Brook')!.dueDate
    expect(marksOn(marks, brookDue).some(mark => mark.code === 'Brook')).toBe(false)

    const crest = seed().find(invoice => invoice.code === 'Crest')!
    expect(marksOn(marks, crest.promise!.dueDate).some(mark => mark.code === 'Crest')).toBe(false)
    expect(marksOn(marks, crest.promise!.recordedAt).map(mark => mark.title)).toContain('Promise recorded')
    const followUp = marksOn(marks, crest.followUps[0]!.at).find(mark => mark.code === 'Crest')!
    expect(calendarSummary(followUp)).toMatch(/^Crest · Follow-up recorded · /)

    const flagged = applyChange(seed(), seedInvoiceIds.Brook, {
      type: 'flag-details',
      value: { note: 'Remittance details look off.' },
    })
    const onDemoDay = marksOn(calendarMarks(flagged.invoices), demoDay)
    expect(onDemoDay.map(mark => mark.title)).toContain('Details flagged for review')
    expect(calendarSummary(onDemoDay.find(mark => mark.code === 'Brook')!)).toMatch(/Details flagged for review/)
  })
})
