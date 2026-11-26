import { describe, expect, it } from 'vitest'
import { activityTimeline } from './activity.ts'
import { applyChange } from './apply-change.ts'
import { seed, seedInvoiceIds } from './seed.ts'
import type { Invoice } from './model.ts'

const byCode = (invoices: Invoice[], code: string) => invoices.find(item => item.code === code)!

describe('activityTimeline', () => {
  it('synthesizes seed follow-ups and promises when history is empty', () => {
    const crest = byCode(seed(), 'Crest')
    const titles = activityTimeline(crest).map(item => item.title)
    expect(titles).toContain('Follow-up recorded')
    expect(titles).toContain('Promise recorded')
  })

  it('prepends a new entry after applyChange while keeping prior activity', () => {
    const before = activityTimeline(byCode(seed(), 'Brook')).length
    const { invoices, errors } = applyChange(seed(), seedInvoiceIds.Brook, {
      type: 'follow-up',
      value: { note: 'Called AP.', channel: 'Phone', answered: false },
    })
    expect(errors).toEqual({})
    const timeline = activityTimeline(byCode(invoices, 'Brook'))
    expect(timeline[0]?.title).toBe('Follow-up recorded')
    expect(timeline[0]?.detail).toMatch(/Called AP/)
    expect(timeline.length).toBe(before + 1)
  })
})
