import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import {
  calendarMarks,
  calendarMonth,
  demoDay,
  marksOn,
  monthAgenda,
  type CalendarMark,
  type CalendarMarkKind,
  type Invoice,
} from '@domain/index.ts'

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const
const kindOrder: CalendarMarkKind[] = ['due', 'promise', 'payment', 'activity']

function formatDay(date: string): string {
  const [yearText, monthText, dayText] = date.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const utc = new Date(Date.UTC(year, month - 1, day))
  return `${weekdayNames[utc.getUTCDay()]}, ${monthNames[utc.getUTCMonth()]} ${day}`
}

function dateInMonth(year: number, month: number, day: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const clamped = Math.min(Math.max(day, 1), last)
  return `${year}-${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`
}

function CalendarEntry({
  mark,
  onOpen,
}: {
  mark: CalendarMark
  onOpen: (invoiceId: string) => void
}) {
  const detail = mark.detail.trim()
  return (
    <button type="button" className={`cal-item kind-${mark.kind}`} onClick={() => onOpen(mark.invoiceId)}>
      <span className="cal-item-name">
        {mark.customer}
        <span className="cal-item-code">{mark.code}</span>
      </span>
      <span className="cal-item-type">
        <span className={`cal-dot kind-${mark.kind}`} aria-hidden="true" />
        {mark.title}
      </span>
      {detail ? <span className="cal-item-detail">{detail}</span> : null}
    </button>
  )
}

export default function DeskCalendar({
  invoices,
  onOpen,
}: {
  invoices: Invoice[]
  onOpen: (invoiceId: string) => void
}) {
  const [view, setView] = useState(() => {
    const [yearText, monthText, dayText] = demoDay.split('-')
    return { year: Number(yearText), month: Number(monthText), day: Number(dayText) }
  })
  const anchor = dateInMonth(view.year, view.month, 1)
  const selected = dateInMonth(view.year, view.month, view.day)
  const month = useMemo(() => calendarMonth(anchor), [anchor])
  const marks = useMemo(() => calendarMarks(invoices), [invoices])
  const agenda = useMemo(() => monthAgenda(invoices, anchor), [invoices, anchor])
  const dayMarks = marksOn(marks, selected)
  const agendaRef = useRef<HTMLDivElement>(null)
  const years = useMemo(() => {
    const markYears = marks
      .map(mark => Number(mark.date.slice(0, 4)))
      .filter(year => Number.isFinite(year))
    const demoYear = Number(demoDay.slice(0, 4))
    const known = markYears.length > 0 ? markYears : [demoYear]
    const min = Math.min(demoYear - 5, view.year, ...known)
    const max = Math.max(demoYear + 5, view.year, ...known)
    return Array.from({ length: max - min + 1 }, (_, index) => min + index)
  }, [marks, view.year])

  useEffect(() => {
    const root = agendaRef.current
    if (!root) return
    const node = root.querySelector<HTMLElement>(`[data-date="${selected}"]`)
    if (!node) {
      root.scrollTo({ top: 0 })
      return
    }
    root.scrollTo({ top: Math.max(0, node.offsetTop - 8) })
  }, [selected, agenda])

  function showMonth(year: number, monthNumber: number) {
    setView(current => ({ year, month: monthNumber, day: current.day }))
  }

  function stepMonth(delta: number) {
    const next = new Date(Date.UTC(view.year, view.month - 1 + delta, 1))
    showMonth(next.getUTCFullYear(), next.getUTCMonth() + 1)
  }

  return (
    <section className="section-block" aria-labelledby="desk-calendar">
      <h2 className="section-label" id="desk-calendar">
        <CalendarOutlined className="section-icon" aria-hidden />
        Calendar
      </h2>
      <div className="cal-card">
        <div className="cal-left">
          <div className="cal-month">
            <div className="cal-nav">
              <button type="button" className="cal-nav-btn" aria-label="Previous month" onClick={() => stepMonth(-1)}>
                <LeftOutlined aria-hidden />
              </button>
              <select
                className="cal-nav-month"
                aria-label="Month"
                value={view.month}
                onChange={event => showMonth(view.year, Number(event.target.value))}
              >
                {monthNames.map((name, index) => (
                  <option key={name} value={index + 1}>{name}</option>
                ))}
              </select>
              <select
                className="cal-nav-year"
                aria-label="Year"
                value={view.year}
                onChange={event => showMonth(Number(event.target.value), view.month)}
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button type="button" className="cal-nav-btn" aria-label="Next month" onClick={() => stepMonth(1)}>
                <RightOutlined aria-hidden />
              </button>
            </div>
            <div className="cal-grid" role="grid" aria-label={month.label}>
              {weekdays.map((label, index) => (
                <span key={`dow-${index}`} className="cal-dow" aria-hidden="true">{label}</span>
              ))}
              {month.weeks.flat().map((date, index) => {
                if (!date) {
                  return <span key={`empty-${index}`} className="cal-day is-empty" />
                }
                const dayMarksForCell = marksOn(marks, date)
                const kinds = kindOrder.filter(kind => dayMarksForCell.some(mark => mark.kind === kind))
                const dayNumber = Number(date.slice(8))
                return (
                  <button
                    key={date}
                    type="button"
                    role="gridcell"
                    className={[
                      'cal-day',
                      date === demoDay ? 'is-today' : '',
                      date === selected ? 'is-selected' : '',
                    ].filter(Boolean).join(' ')}
                    aria-pressed={date === selected}
                    aria-label={`${month.label} ${dayNumber}, ${dayMarksForCell.length === 0 ? 'nothing recorded' : `${dayMarksForCell.length} recorded`}`}
                    onClick={() => setView(current => ({ ...current, day: dayNumber }))}
                  >
                    <span className="cal-num">{dayNumber}</span>
                    <span className="cal-dots" aria-hidden="true">
                      {kinds.length === 0
                        ? <span className="cal-dot is-off" />
                        : kinds.map(kind => <span key={kind} className={`cal-dot kind-${kind}`} />)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="cal-day-summary" aria-live="polite">
            <h3 className="cal-day-heading">{formatDay(selected)}</h3>
            {dayMarks.length === 0 ? (
              <p className="cal-empty">Nothing on this day.</p>
            ) : (
              <ul>
                {dayMarks.map((mark, index) => (
                  <li key={`${mark.invoiceId}-${mark.kind}-${mark.title}-${index}`}>
                    <CalendarEntry mark={mark} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="cal-agenda" ref={agendaRef} tabIndex={0} aria-label={`${month.label} by day`}>
          {agenda.length === 0 ? (
            <p className="cal-empty">Nothing this month.</p>
          ) : (
            agenda.map(group => (
              <section
                key={group.date}
                className={group.date === selected ? 'cal-agenda-day is-selected' : 'cal-agenda-day'}
                data-date={group.date}
              >
                <h3 className="cal-agenda-heading">{formatDay(group.date)}</h3>
                <ul>
                  {group.marks.map((mark, index) => (
                    <li key={`${mark.invoiceId}-${mark.kind}-${mark.title}-${index}`}>
                      <CalendarEntry mark={mark} onOpen={onOpen} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
