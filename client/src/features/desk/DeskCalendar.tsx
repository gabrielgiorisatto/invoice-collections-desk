import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarOutlined } from '@ant-design/icons'
import {
  calendarMarks,
  calendarMonth,
  calendarSummary,
  demoDay,
  marksOn,
  monthAgenda,
  type Invoice,
} from '@domain/index.ts'

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

function formatDay(date: string): string {
  const [yearText, monthText, dayText] = date.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const utc = new Date(Date.UTC(year, month - 1, day))
  return `${weekdayNames[utc.getUTCDay()]}, ${monthNames[utc.getUTCMonth()]} ${day}`
}

export default function DeskCalendar({
  invoices,
  onOpen,
}: {
  invoices: Invoice[]
  onOpen: (invoiceId: string) => void
}) {
  const month = useMemo(() => calendarMonth(), [])
  const marks = useMemo(() => calendarMarks(invoices), [invoices])
  const agenda = useMemo(() => monthAgenda(invoices), [invoices])
  const [selected, setSelected] = useState(demoDay)
  const dayMarks = marksOn(marks, selected)
  const dates = useMemo(() => new Set(marks.map(mark => mark.date)), [marks])
  const agendaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = agendaRef.current
    const node = root?.querySelector<HTMLElement>(`[data-date="${selected}"]`)
    if (!root || !node) return
    root.scrollTo({ top: Math.max(0, node.offsetTop - 8) })
  }, [selected])

  return (
    <section className="section-block" aria-labelledby="desk-calendar">
      <h2 className="section-label" id="desk-calendar">
        <CalendarOutlined className="section-icon" aria-hidden />
        Calendar
      </h2>
      <div className="cal-card">
        <div className="cal-left">
          <div className="cal-month">
            <h3 className="cal-month-label">{month.label}</h3>
            <div className="cal-grid" role="grid" aria-label={month.label}>
              {weekdays.map((label, index) => (
                <span key={`dow-${index}`} className="cal-dow" aria-hidden="true">{label}</span>
              ))}
              {month.weeks.flat().map((date, index) => {
                if (!date) {
                  return <span key={`empty-${index}`} className="cal-day is-empty" />
                }
                const count = marksOn(marks, date).length
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
                    aria-label={`${month.label} ${dayNumber}, ${count === 0 ? 'nothing recorded' : `${count} recorded`}`}
                    onClick={() => setSelected(date)}
                  >
                    <span className="cal-num">{dayNumber}</span>
                    {dates.has(date) ? <span className="cal-dot" aria-hidden="true" /> : <span className="cal-dot is-off" aria-hidden="true" />}
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
                  <li key={`${mark.invoiceId}-${mark.title}-${index}`}>
                    <button type="button" className="cal-item" onClick={() => onOpen(mark.invoiceId)}>
                      {calendarSummary(mark)}
                    </button>
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
                    <li key={`${mark.invoiceId}-${mark.title}-${index}`}>
                      <button type="button" className="cal-item" onClick={() => onOpen(mark.invoiceId)}>
                        {calendarSummary(mark)}
                      </button>
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
