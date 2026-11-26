import { dateFilterLabels, type DateFilterPreset } from './date-filter.ts'
import type { Invoice } from './model.ts'
import { inActiveQueue } from './rules.ts'
import {
  describeQueueFilters,
  emptyQueueFilters,
  filterByQueueFilters,
  matchesQueueFilters,
  type QueueFilters,
} from './queue-query.ts'

/** How the desk queue should present itself for the current session + filters. */
export type DeskQueueView =
  | { kind: 'ready'; active: Invoice[] }
  | {
    kind: 'filter-no-match'
    preset: DateFilterPreset
    cause: 'due-window' | 'queue-filters'
    filters: QueueFilters
  }
  | { kind: 'all-cleared'; settled: Invoice[] }

export type DeskEmptyCopy = {
  title: string
  description: string
  actionLabel?: string
  /** Which control the empty-state action should reset. */
  action?: 'show-all-time' | 'clear-filters'
}

/**
 * Classify queue empty vs ready for the due window + optional Status/Promise/Priority facets.
 * Session-wide all-cleared wins over a narrow filter with no matches.
 */
export function deskQueueView(
  session: Invoice[],
  dueFiltered: Invoice[],
  preset: DateFilterPreset,
  filters: QueueFilters = emptyQueueFilters,
): DeskQueueView {
  const sessionActive = session.filter(inActiveQueue)
  if (session.length > 0 && sessionActive.length === 0) {
    return { kind: 'all-cleared', settled: session }
  }

  const dueActive = dueFiltered.filter(inActiveQueue)
  const matched = filterByQueueFilters(dueActive, filters)

  if (matched.length === 0) {
    return {
      kind: 'filter-no-match',
      preset,
      cause: dueActive.length === 0 ? 'due-window' : 'queue-filters',
      filters,
    }
  }

  return { kind: 'ready', active: matched }
}

/**
 * Rows for the queue table. Paid and resolved stay out until the operator
 * turns on Show paid. Due window and the other facets still apply.
 */
export function visibleQueue(
  view: DeskQueueView,
  dueFiltered: Invoice[],
  filters: QueueFilters,
  showPaid: boolean,
): Invoice[] {
  const active = view.kind === 'ready' ? view.active : []
  if (!showPaid) return active
  const seen = new Set(active.map(invoice => invoice.id))
  const settled = dueFiltered.filter(invoice =>
    !inActiveQueue(invoice)
    && !seen.has(invoice.id)
    && matchesQueueFilters(invoice, filters),
  )
  return [...active, ...settled]
}

export function deskEmptyCopy(view: Exclude<DeskQueueView, { kind: 'ready' }>): DeskEmptyCopy {
  switch (view.kind) {
    case 'filter-no-match': {
      if (view.cause === 'queue-filters') {
        const facets = describeQueueFilters(view.filters).join(' · ')
        return {
          title: 'No invoices match these filters',
          description: facets
            ? `Nothing matches ${facets}. Clear filters or widen the due window.`
            : 'Nothing matches the current filters.',
          actionLabel: 'Clear filters',
          action: 'clear-filters',
        }
      }
      const label = dateFilterLabels[view.preset]
      return {
        title: 'No invoices in this due window',
        description: `Nothing matches ${label}. Try a wider due window or show all time.`,
        actionLabel: 'Show all time',
        action: 'show-all-time',
      }
    }
    case 'all-cleared':
      return {
        title: 'Queue cleared',
        description: 'Every invoice in this session is paid or resolved. Nothing left to chase.',
      }
    default: {
      const _exhaustive: never = view
      return _exhaustive
    }
  }
}
