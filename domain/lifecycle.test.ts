import { describe, expect, it } from 'vitest'
import { applyChange } from './apply-change.ts'
import { actionDisabledReason, actionDisplayOrder, availableActions, primaryActionKind } from './lifecycle.ts'
import { type Invoice } from './index.ts'
import { seed, seedInvoiceIds } from './seed.ts'

const byCode = (invoices: Invoice[], code: string) => invoices.find(item => item.code === code)!

describe('availableActions lifecycle matrix', () => {
  it('open / never contacted (Brook): follow-up, flag-details, promise, dispute, payment', () => {
    expect(availableActions(byCode(seed(), 'Brook'))).toEqual([
      'follow-up', 'flag-details', 'promise', 'payment', 'dispute',
    ])
    expect(primaryActionKind(byCode(seed(), 'Brook'))).toBe('follow-up')
  })

  it('broken promise (Dune): follow-up, promise, payment', () => {
    expect(availableActions(byCode(seed(), 'Dune'))).toEqual([
      'follow-up', 'promise', 'payment',
    ])
  })

  it('active promise (Crest): payment and resolve only', () => {
    expect(availableActions(byCode(seed(), 'Crest'))).toEqual(['payment', 'resolve'])
  })

  it('unverified (Grove): confirm-details and dispute (+ payment)', () => {
    expect(availableActions(byCode(seed(), 'Grove'))).toEqual([
      'confirm-details', 'payment', 'dispute',
    ])
  })

  it('open dispute (Aster): dispute, route-am, resolve (+ payment)', () => {
    expect(availableActions(byCode(seed(), 'Aster'))).toEqual([
      'payment', 'dispute', 'route-am', 'resolve',
    ])
  })

  it('paid / resolved → none', () => {
    let invoices = applyChange(seed(), seedInvoiceIds.Brook, {
      type: 'payment',
      value: { amount: 1800, note: 'Paid in full' },
    }).invoices
    expect(availableActions(byCode(invoices, 'Brook'))).toEqual([])

    invoices = applyChange(seed(), seedInvoiceIds.Aster, {
      type: 'resolve',
      value: { reason: 'dispute_closed', note: 'Closed' },
    }).invoices
    expect(availableActions(byCode(invoices, 'Aster'))).toEqual([])
  })

  it('applyChange rejects actions outside the matrix', () => {
    const invoices = seed()
    const result = applyChange(invoices, seedInvoiceIds.Crest, {
      type: 'follow-up',
      value: { note: 'Should not work', channel: 'Email', answered: false },
    })
    expect(result.errors).toHaveProperty('form')
    expect(result.invoices).toBe(invoices)
    expect(byCode(result.invoices, 'Crest').followUps).toHaveLength(1)
  })

  it('actionDisabledReason explains disabled kinds; null when enabled', () => {
    const crest = byCode(seed(), 'Crest')
    expect(actionDisabledReason(crest, 'payment')).toBeNull()
    expect(actionDisabledReason(crest, 'follow-up')).toMatch(/promise is active/i)
    expect(actionDisplayOrder).toHaveLength(8)
  })

  it('follow-up never sets needs verification; flag-details does from zero', () => {
    const afterFollowUp = applyChange(seed(), seedInvoiceIds.Brook, {
      type: 'follow-up',
      value: { note: 'Left voicemail', channel: 'Phone', answered: false },
    }).invoices
    expect(byCode(afterFollowUp, 'Brook').invoiceAccuracy).toBe('ok')

    const flagged = applyChange(seed(), seedInvoiceIds.Brook, {
      type: 'flag-details',
      value: { note: 'Remittance address looks wrong.' },
    }).invoices
    expect(byCode(flagged, 'Brook').invoiceAccuracy).toBe('unverified_claim')
    expect(byCode(flagged, 'Brook').history?.[0]?.title).toMatch(/flagged/i)
  })
})
