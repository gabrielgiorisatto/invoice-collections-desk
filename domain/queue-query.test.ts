import { describe, expect, it } from 'vitest'
import {
  compareQueueColumn,
  describeQueueFilters,
  emptyQueueFilters,
  filterByQueueFilters,
  queueFiltersActive,
  queuePriorityFacet,
  queueStatusKind,
  sortQueue,
  type QueueFilters,
} from './queue-query.ts'
import { seed } from './seed.ts'
import { priorityTier, promiseStatus } from './rules.ts'

const byCode = (code: string) => seed().find(item => item.code === code)!

describe('queueStatusKind / queuePriorityFacet', () => {
  it('maps seed invoices to operator-facing status and priority facets', () => {
    expect(queueStatusKind(byCode('Brook'))).toBe('open')
    expect(queueStatusKind(byCode('Dune'))).toBe('broken')
    expect(queueStatusKind(byCode('Aster'))).toBe('disputed')
    expect(queueStatusKind(byCode('Crest'))).toBe('promised')
    expect(queueStatusKind(byCode('Grove'))).toBe('unverified')
    expect(queuePriorityFacet(byCode('Dune'))).toBe('high')
    expect(queuePriorityFacet(byCode('East'))).toBe('med')
    expect(queuePriorityFacet(byCode('Crest'))).toBe('low')
  })
})

describe('filterByQueueFilters', () => {
  it('returns all invoices when no facets are set', () => {
    expect(filterByQueueFilters(seed(), emptyQueueFilters)).toHaveLength(6)
    expect(queueFiltersActive(emptyQueueFilters)).toBe(false)
  })

  it('filters by Status = Open', () => {
    const filters: QueueFilters = { ...emptyQueueFilters, status: 'open' }
    const codes = filterByQueueFilters(seed(), filters).map(item => item.code).sort()
    expect(codes).toEqual(['Brook', 'East'])
    expect(describeQueueFilters(filters)).toEqual(['Status: Open'])
  })

  it('filters by Promise = Broken', () => {
    const filters: QueueFilters = { ...emptyQueueFilters, promise: 'broken' }
    const codes = filterByQueueFilters(seed(), filters).map(item => item.code)
    expect(codes).toEqual(['Dune'])
    expect(promiseStatus(byCode('Dune'))).toBe('broken')
    expect(describeQueueFilters(filters)).toEqual(['Promise: Broken'])
  })

  it('filters by Priority = High', () => {
    const filters: QueueFilters = { ...emptyQueueFilters, priority: 'high' }
    const codes = filterByQueueFilters(seed(), filters).map(item => item.code).sort()
    expect(codes.every(code => priorityTier(byCode(code)) === 'P0')).toBe(true)
    expect(codes).toEqual(['Brook', 'Dune', 'Grove'])
    expect(describeQueueFilters(filters)).toEqual(['Priority: High'])
  })

  it('combines Status + Priority facets (AND)', () => {
    const filters: QueueFilters = { ...emptyQueueFilters, status: 'open', priority: 'high' }
    const codes = filterByQueueFilters(seed(), filters).map(item => item.code)
    expect(codes).toEqual(['Brook'])
    expect(describeQueueFilters(filters)).toEqual(['Status: Open', 'Priority: High'])
    expect(queueFiltersActive(filters)).toBe(true)
  })
})

describe('sortQueue', () => {
  it('sorts by remaining ascending then descending', () => {
    const asc = sortQueue(seed(), 'remaining', 'ascend').map(item => item.code)
    const desc = sortQueue(seed(), 'remaining', 'descend').map(item => item.code)
    expect(asc[0]).toBe('Brook') // 1800
    expect(asc[asc.length - 1]).toBe('Aster') // 12000
    expect(desc[0]).toBe('Aster')
    expect(desc[desc.length - 1]).toBe('Brook')
  })

  it('sorts by priority High→Clear (ascend = High first)', () => {
    const ordered = sortQueue(seed(), 'priority', 'ascend')
    expect(compareQueueColumn(ordered[0], ordered[ordered.length - 1], 'priority')).toBeLessThanOrEqual(0)
    expect(priorityTier(ordered[0])).toBe('P0')
    expect(priorityTier(ordered[ordered.length - 1])).toBe('P2')
  })

  it('sorts by invoice code alphabetically', () => {
    const codes = sortQueue(seed(), 'invoice', 'ascend').map(item => item.code)
    expect(codes).toEqual([...codes].sort())
  })
})
