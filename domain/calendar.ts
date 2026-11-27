import { activityTimeline } from './activity.ts'
import { demoDay, type Invoice } from './model.ts'

export type CalendarMarkKind = 'due' | 'promise' | 'payment' | 'activity'

export type CalendarMark = {
  date: string
  invoiceId: string
  code: string
  customer: string
  title: string
  detail: string
  kind: CalendarMarkKind
}

export type CalendarMonth = {
  key: string
  label: string
  weeks: (string | null)[][]
}

export type CalendarDayGroup = {
  date: string
  marks: CalendarMark[]
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

const kindRank: Record<CalendarMarkKind, number> = {
  due: 0,
  promise: 1,
  payment: 2,
  activity: 3,
}

function markKind(title: string): CalendarMarkKind {
  switch (title) {
    case 'Invoice due':
      return 'due'
    case 'Promise due':
      return 'promise'
    case 'Payment received':
      return 'payment'
    default:
      return 'activity'
  }
}

/** Activity, plus the invoice due date and the promise date when one is on file. */
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
        kind: markKind(entry.title),
      })
    }
    marks.push({
      date: invoice.dueDate.slice(0, 10),
      invoiceId: invoice.id,
      code: invoice.code,
      customer: invoice.customer,
      title: 'Invoice due',
      detail: '',
      kind: 'due',
    })
    if (invoice.promise) {
      marks.push({
        date: invoice.promise.dueDate.slice(0, 10),
        invoiceId: invoice.id,
        code: invoice.code,
        customer: invoice.customer,
        title: 'Promise due',
        detail: invoice.promise.note,
        kind: 'promise',
      })
    }
  }
  return marks.sort((a, b) =>
    a.date.localeCompare(b.date)
    || kindRank[a.kind] - kindRank[b.kind]
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

/** The month that contains the anchor day. Weeks start Sunday. */
export function calendarMonth(anchor = demoDay): CalendarMonth {
  const [yearText, monthText] = anchor.split('-')
  return buildMonth(Number(yearText), Number(monthText) - 1)
}

/** This month’s marks, grouped by day, days in order. */
export function monthAgenda(invoices: Invoice[], anchor = demoDay): CalendarDayGroup[] {
  const prefix = `${calendarMonth(anchor).key}-`
  const groups: CalendarDayGroup[] = []
  for (const mark of calendarMarks(invoices)) {
    if (!mark.date.startsWith(prefix)) continue
    const last = groups.at(-1)
    if (last && last.date === mark.date) last.marks.push(mark)
    else groups.push({ date: mark.date, marks: [mark] })
  }
  return groups
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
