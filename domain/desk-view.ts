import { dateFilterLabels, type DateFilterPreset } from './date-filter.ts'
import type { Invoice } from './model.ts'
import { inActiveQueue } from './rules.ts'

/** How the desk queue should present itself for the current session + due window. */
export type DeskQueueView =
  | { kind: 'ready'; active: Invoice[] }
  | { kind: 'filter-no-match'; preset: DateFilterPreset }
  | { kind: 'all-cleared'; settled: Invoice[] }

export type DeskEmptyCopy = {
  title: string
  description: string
  actionLabel?: string
}

/**
 * Classify queue empty vs ready for the filtered due window.
 * Session-wide all-cleared wins over a narrow filter with no matches.
 */
export function deskQueueView(
  session: Invoice[],
  filtered: Invoice[],
  preset: DateFilterPreset,
): DeskQueueView {
  const sessionActive = session.filter(inActiveQueue)
  if (session.length > 0 && sessionActive.length === 0) {
    return { kind: 'all-cleared', settled: session }
  }

  const filteredActive = filtered.filter(inActiveQueue)
  if (filteredActive.length === 0) {
    return { kind: 'filter-no-match', preset }
  }

  return { kind: 'ready', active: filteredActive }
}

export function deskEmptyCopy(view: Exclude<DeskQueueView, { kind: 'ready' }>): DeskEmptyCopy {
  switch (view.kind) {
    case 'filter-no-match': {
      const label = dateFilterLabels[view.preset]
      return {
        title: 'No invoices in this due window',
        description: `Nothing matches ${label}. Try a wider due window or show all time.`,
        actionLabel: 'Show all time',
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
