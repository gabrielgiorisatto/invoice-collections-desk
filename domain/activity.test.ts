import { describe, expect, it } from 'vitest'
import { activityTimeline } from './activity.ts'
import { applyChange } from './apply-change.ts'
import { explainPriority } from './rules.ts'
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
    expect(timeline[0]?.detail).toBe('Phone · Unanswered · Called AP.')
    expect(timeline.length).toBe(before + 1)
  })

  it('labels each follow-up Answered or Unanswered, and a later answer clears unanswered', () => {
    const east = byCode(seed(), 'East')
    const seeded = activityTimeline(east).filter(item => item.title === 'Follow-up recorded')
    expect(seeded).toHaveLength(2)
    expect(seeded.every(item => item.detail.includes('Unanswered'))).toBe(true)
    expect(explainPriority(east).reason).toBe('Unanswered follow-ups — AM available.')

    const answered = applyChange(seed(), seedInvoiceIds.East, {
      type: 'follow-up',
      value: { note: 'They replied.', channel: 'Phone', answered: true },
    })
    const afterAnswer = activityTimeline(byCode(answered.invoices, 'East'))
    expect(afterAnswer[0]?.detail).toBe('Phone · Answered · They replied.')
    expect(afterAnswer.filter(item => item.title === 'Follow-up recorded').slice(1).every(item => item.detail.includes('Unanswered'))).toBe(true)
    expect(explainPriority(byCode(answered.invoices, 'East')).reason).toBe('Open balance — ready to chase.')

    const firstUnanswered = applyChange(answered.invoices, seedInvoiceIds.East, {
      type: 'follow-up',
      value: { note: 'No reply.', channel: 'Email', answered: false },
    })
    const secondUnanswered = applyChange(firstUnanswered.invoices, seedInvoiceIds.East, {
      type: 'follow-up',
      value: { note: 'Still no reply.', channel: 'Email', answered: false },
    })
    const latest = activityTimeline(byCode(secondUnanswered.invoices, 'East'))
    expect(latest[0]?.detail).toBe('Email · Unanswered · Still no reply.')
    expect(latest[1]?.detail).toBe('Email · Unanswered · No reply.')
    expect(explainPriority(byCode(secondUnanswered.invoices, 'East')).reason).toBe('Unanswered follow-ups — AM available.')
  })
})
