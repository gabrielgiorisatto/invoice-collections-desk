import { demoDay, type Invoice } from './model.ts'
import { disputeStatus, inActiveQueue, remaining, totalPayments } from './rules.ts'

/** Due-date window presets relative to demoDay. Default: all-time. */
export type DateFilterPreset =
  | 'last-day'
  | 'last-7-days'
  | 'this-month'
  | 'this-year'
  | 'all-time'

export const dateFilterPresets: DateFilterPreset[] = [
  'last-day',
  'last-7-days',
  'this-month',
  'this-year',
  'all-time',
]

export const dateFilterLabels: Record<DateFilterPreset, string> = {
  'last-day': 'Last day',
  'last-7-days': 'Last 7 days',
  'this-month': 'This month',
  'this-year': 'This year',
  'all-time': 'All time',
}

export function shiftDay(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Whether an invoice’s due date falls in the preset window ending at `asOf` (demo day).
 * - last-day: [asOf−1, asOf]
 * - last-7-days: [asOf−6, asOf] (7 calendar days inclusive)
 * - this-month / this-year: same calendar month / year as asOf
 * - all-time: always
 */
export function matchesDueWindow(
  invoice: Invoice,
  preset: DateFilterPreset,
  asOf: string = demoDay,
): boolean {
  const due = invoice.dueDate
  switch (preset) {
    case 'all-time':
      return true
    case 'last-day':
      return due >= shiftDay(asOf, -1) && due <= asOf
    case 'last-7-days':
      return due >= shiftDay(asOf, -6) && due <= asOf
    case 'this-month':
      return due.slice(0, 7) === asOf.slice(0, 7)
    case 'this-year':
      return due.slice(0, 4) === asOf.slice(0, 4)
    default: {
      const _exhaustive: never = preset
      return _exhaustive
    }
  }
}

export function filterByDueWindow(
  invoices: Invoice[],
  preset: DateFilterPreset,
  asOf: string = demoDay,
): Invoice[] {
  return invoices.filter(invoice => matchesDueWindow(invoice, preset, asOf))
}

/** Active Remaining excluding open disputes (cash still chaseable). */
export function openRemainingTotal(invoices: Invoice[]): number {
  return invoices
    .filter(inActiveQueue)
    .filter(invoice => disputeStatus(invoice) !== 'open')
    .reduce((sum, invoice) => sum + remaining(invoice), 0)
}

/** Sum of recorded payment amounts (ADR-0003 cash side). */
export function paidTotal(invoices: Invoice[]): number {
  return totalPayments(invoices)
}
