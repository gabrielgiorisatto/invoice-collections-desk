import { describe, expect, it } from 'vitest'
import { applyChange } from './apply-change.ts'
import {
  actionDisabledReason,
  actionDisplayOrder,
  actionGroups,
  availableActions,
  primaryActionKind,
} from './lifecycle.ts'
import { type Invoice } from './index.ts'
import { disputeStatus, explainPriority, priorityTier, promiseStatus } from './rules.ts'
import { seed, seedInvoiceIds } from './seed.ts'

const byCode = (invoices: Invoice[], code: string) => invoices.find(item => item.code === code)!

describe('availableActions lifecycle matrix', () => {
  it('open / never contacted (Brook): follow-up, flag, create promise, dispute, payment, resolve', () => {
    expect(availableActions(byCode(seed(), 'Brook'))).toEqual([
      'follow-up', 'flag-details', 'promise', 'dispute', 'payment', 'resolve',
    ])
    expect(primaryActionKind(byCode(seed(), 'Brook'))).toBe('follow-up')
  })

  it('broken promise (Dune): follow-up, update or cancel promise, dispute, payment, resolve — no second promise', () => {
    expect(availableActions(byCode(seed(), 'Dune'))).toEqual([
      'follow-up', 'flag-details', 'promise', 'cancel-promise', 'dispute', 'payment', 'resolve',
    ])
    expect(availableActions(byCode(seed(), 'Dune'))).not.toContain('confirm-details')
  })

  it('active promise (Crest): follow-up stays; payment and resolve stay; promise is update or cancel', () => {
    expect(availableActions(byCode(seed(), 'Crest'))).toEqual([
      'follow-up', 'flag-details', 'promise', 'cancel-promise', 'dispute', 'payment', 'resolve',
    ])
    expect(primaryActionKind(byCode(seed(), 'Crest'))).toBe('payment')
  })

  it('unverified (Grove): confirm or cancel the one request — no second flag', () => {
    expect(availableActions(byCode(seed(), 'Grove'))).toEqual([
      'follow-up', 'confirm-details', 'cancel-details', 'promise', 'dispute', 'payment', 'resolve',
    ])
    expect(primaryActionKind(byCode(seed(), 'Grove'))).toBe('confirm-details')
  })

  it('open dispute (Aster): update or cancel, route-am is separate, follow-up still allowed', () => {
    expect(availableActions(byCode(seed(), 'Aster'))).toEqual([
      'follow-up', 'flag-details', 'promise', 'dispute', 'cancel-dispute', 'payment', 'resolve', 'route-am',
    ])
    expect(primaryActionKind(byCode(seed(), 'Aster'))).toBe('route-am')
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
    const result = applyChange(invoices, seedInvoiceIds.Brook, {
      type: 'confirm-details',
      value: { note: 'Nothing is open to confirm.' },
    })
    expect(result.errors).toHaveProperty('form')
    expect(result.invoices).toBe(invoices)
    expect(byCode(result.invoices, 'Brook').invoiceAccuracy).toBe('ok')
  })

  it('actionDisabledReason explains disabled kinds; null when enabled', () => {
    const crest = byCode(seed(), 'Crest')
    expect(actionDisabledReason(crest, 'payment')).toBeNull()
    expect(actionDisabledReason(crest, 'follow-up')).toBeNull()
    expect(actionDisabledReason(crest, 'resolve')).toBeNull()
    expect(actionDisabledReason(crest, 'confirm-details')).toMatch(/no open details/i)
    expect(actionDisabledReason(crest, 'cancel-promise')).toBeNull()
    expect(actionDisabledReason(byCode(seed(), 'Brook'), 'cancel-promise')).toMatch(/no promise/i)
    expect(actionDisabledReason(byCode(seed(), 'Grove'), 'flag-details')).toMatch(/already open/i)
    expect(actionGroups.find(group => group.id === 'settlement')?.kinds).toEqual(['payment', 'resolve'])
    expect(actionGroups.find(group => group.id === 'contact')?.kinds).toEqual(['follow-up'])
    expect(actionGroups.find(group => group.id === 'account-manager')?.kinds).toEqual(['route-am'])
    expect(actionDisplayOrder).toHaveLength(11)
  })

  it('follow-up never sets needs verification; flag-details does from zero and cannot stack', () => {
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

    const second = applyChange(flagged, seedInvoiceIds.Brook, {
      type: 'flag-details',
      value: { note: 'Another flag.' },
    })
    expect(second.errors).toHaveProperty('form')
    expect(second.invoices).toBe(flagged)
  })

  it('confirm or cancel the one details request', () => {
    const cancelled = applyChange(seed(), seedInvoiceIds.Grove, {
      type: 'cancel-details',
      value: { note: 'Customer withdrew the claim.' },
    }).invoices
    expect(byCode(cancelled, 'Grove').invoiceAccuracy).toBe('ok')
    expect(byCode(cancelled, 'Grove').history?.[0]?.title).toMatch(/cancelled/i)
    expect(byCode(cancelled, 'Grove').history?.[0]?.title).not.toMatch(/verified/i)
  })

  it('updates the one promise and does not stack a second', () => {
    const before = byCode(seed(), 'Crest')
    const { invoices, errors } = applyChange(seed(), seedInvoiceIds.Crest, {
      type: 'promise',
      value: { dueDate: '2026-11-30', note: 'AP moved the date.' },
    })
    expect(errors).toEqual({})
    const crest = byCode(invoices, 'Crest')
    expect(crest.promise?.dueDate).toBe('2026-11-30')
    expect(crest.promise?.note).toBe('AP moved the date.')
    expect(promiseStatus(crest)).toBe('active')
    expect(crest.history?.[0]?.title).toBe('Promise updated')
    expect(crest.history?.[0]?.detail).toContain(before.promise?.dueDate)
  })

  it('opens a dispute on a broken promise without clearing it, and that is not a cold chase', () => {
    const { invoices, errors } = applyChange(seed(), seedInvoiceIds.Dune, {
      type: 'dispute',
      value: { reason: 'Quantity mismatch', evidence: 'Packing slip', status: 'open' },
    })
    expect(errors).toEqual({})
    const dune = byCode(invoices, 'Dune')
    expect(promiseStatus(dune)).toBe('broken')
    expect(dune.promise?.dueDate).toBe(byCode(seed(), 'Dune').promise?.dueDate)
    expect(disputeStatus(dune)).toBe('open')
    expect(priorityTier(dune)).toBe('P1')
    expect(explainPriority(dune).reason).toMatch(/not a cold chase/i)
    expect(dune.followUps).toHaveLength(1)
  })

  it('route to AM does not record a follow-up', () => {
    const before = byCode(seed(), 'Aster').followUps.length
    const { invoices } = applyChange(seed(), seedInvoiceIds.Aster, {
      type: 'route-am',
      value: { note: 'Hand off quantity dispute (simulation).' },
    })
    const aster = byCode(invoices, 'Aster')
    expect(aster.ownerRole).toBe('account_manager')
    expect(aster.followUps).toHaveLength(before)
    expect(aster.history?.[0]?.title).toMatch(/routed to am/i)
  })
})
