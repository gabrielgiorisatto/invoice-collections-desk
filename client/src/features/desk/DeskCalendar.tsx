import { useMemo, useState } from 'react'
import { CalendarOutlined } from '@ant-design/icons'
import {
  calendarMarks,
  calendarMonths,
  calendarSummary,
  demoDay,
  marksOn,
  type Invoice,
} from '@domain/index.ts'

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

export default function DeskCalendar({
  invoices,
  onOpen,
}: {
  invoices: Invoice[]
  onOpen: (invoiceId: string) => void
}) {
  const months = useMemo(() => calendarMonths(), [])
  const marks = useMemo(() => calendarMarks(invoices), [invoices])
  const [selected, setSelected] = useState(demoDay)
  const dayMarks = marksOn(marks, selected)
  const dates = useMemo(() => new Set(marks.map(mark => mark.date)), [marks])

  return (
    <section className="section-block" aria-labelledby="desk-calendar">
      <h2 className="section-label" id="desk-calendar">
        <CalendarOutlined className="section-icon" aria-hidden />
        Calendar
      </h2>
      <div className="cal-card">
        <div className="cal-months">
          {months.map(month => (
            <div key={month.key} className="cal-month">
              <h3 className="cal-month-label">{month.label}</h3>
              <div className="cal-grid" role="grid" aria-label={month.label}>
                {weekdays.map((label, index) => (
                  <span key={`${month.key}-dow-${index}`} className="cal-dow" aria-hidden="true">{label}</span>
                ))}
                {month.weeks.flat().map((date, index) => {
                  if (!date) {
                    return <span key={`${month.key}-empty-${index}`} className="cal-day is-empty" />
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
          ))}
        </div>
        <div className="cal-day-list" aria-live="polite">
          <h3 className="cal-day-heading">{selected}</h3>
          {dayMarks.length === 0 ? (
            <p className="cal-empty">Nothing recorded this day.</p>
          ) : (
            <ul>
              {dayMarks.map((mark, index) => (
                <li key={`${mark.invoiceId}-${index}`}>
                  <button type="button" className="cal-item" onClick={() => onOpen(mark.invoiceId)}>
                    {calendarSummary(mark)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
