import { activityTimeline } from './activity.ts'
import { demoDay, type Invoice } from './model.ts'

export type CalendarMark = {
  date: string
  invoiceId: string
  code: string
  customer: string
  title: string
  detail: string
}

export type CalendarMonth = {
  key: string
  label: string
  weeks: (string | null)[][]
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

/** Every activity record, newest data first within a day. Not limited to due, promise, payment, or follow-up. */
export function calendarMarks(invoices: Invoice[]): CalendarMark[] {
  const marks: CalendarMark[] = []
  for (const invoice of invoices) {
    for (const entry of activityTimeline(invoice)) {
      marks.push({
        date: entry.at.slice(0, 10),
        invoiceId: invoice.id,
        code: invoice.code,
        customer: invoice.customer,
        title: entry.title,
        detail: entry.detail,
      })
    }
  }
  return marks.sort((a, b) =>
    a.date.localeCompare(b.date)
    || a.code.localeCompare(b.code)
    || a.title.localeCompare(b.title),
  )
}

export function marksOn(marks: CalendarMark[], date: string): CalendarMark[] {
  return marks.filter(mark => mark.date === date)
}

export function calendarSummary(mark: CalendarMark): string {
  const detail = mark.detail.trim()
  const head = `${mark.code} · ${mark.title}`
  if (!detail) return head
  const short = detail.length > 80 ? `${detail.slice(0, 79)}…` : detail
  return `${head} · ${short}`
}

/** Last month, this month, and next month around the demo day. Weeks start Sunday. */
export function calendarMonths(anchor = demoDay): CalendarMonth[] {
  const [yearText, monthText] = anchor.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  return [-1, 0, 1].map(offset => buildMonth(year, month - 1 + offset))
}

function buildMonth(year: number, monthIndex: number): CalendarMonth {
  const first = new Date(Date.UTC(year, monthIndex, 1))
  const y = first.getUTCFullYear()
  const m = first.getUTCMonth()
  const key = `${y}-${String(m + 1).padStart(2, '0')}`
  const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const cells: (string | null)[] = Array.from({ length: first.getUTCDay() }, () => null)
  for (let day = 1; day <= count; day += 1) {
    cells.push(`${key}-${String(day).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7))
  }
  return { key, label: `${monthNames[m]} ${y}`, weeks }
}
