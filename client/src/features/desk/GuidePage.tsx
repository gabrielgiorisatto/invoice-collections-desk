import type { PriorityTier } from '@domain/index.ts'
import { PriorityTag, StatusTag } from './queueMarks.tsx'
import type { GlanceTone } from './tableGlance.ts'

const dashboard = [
  { term: 'Open remaining', detail: 'Cash still to collect. Open disputes stay out of this total.' },
  { term: 'Paid total', detail: 'Cash from Record payment. Resolve without payment leaves it unchanged.' },
  { term: 'Broken promises', detail: 'Promises whose date has already passed.' },
  { term: 'Disputed', detail: 'Invoices with an open dispute.' },
] as const

const nextUp = [
  'Three invoices for this morning.',
  'High first: broken promise, then never contacted, then Needs check.',
  'Med fills a slot when fewer than three are High. Low waits.',
  'An open dispute is Med, even when the promise is broken.',
  'A card leaves when priority changes, the invoice leaves the queue, or the due window hides it.',
] as const

const statuses: { label: string; tone: GlanceTone; detail: string }[] = [
  { label: 'Open', tone: 'wait', detail: 'In the queue.' },
  { label: 'Promised', tone: 'wait', detail: 'Promise date is still ahead.' },
  { label: 'Broken', tone: 'attention', detail: 'Promise date has passed.' },
  { label: 'Disputed', tone: 'caution', detail: 'Dispute is open.' },
  { label: 'Needs check', tone: 'attention', detail: 'Details are not verified.' },
  { label: 'Partial', tone: 'wait', detail: 'Some cash recorded. Still in the queue.' },
  { label: 'Paid', tone: 'ok', detail: 'Remaining is zero. Turn on Show paid.' },
  { label: 'Resolved', tone: 'neutral', detail: 'Closed with Resolve without payment. Turn on Show paid.' },
]

const priorities: { tier: PriorityTier; detail: string }[] = [
  { tier: 'P0', detail: 'Broken promise, no contact yet, or Needs check.' },
  { tier: 'P1', detail: 'Open dispute, or follow-ups with no answer.' },
  { tier: 'P2', detail: 'Active promise. Wait.' },
  { tier: 'P3', detail: 'Paid or resolved.' },
]

const columns = [
  { term: 'Customer / Invoice', detail: 'Customer and code. Click the row to open it.' },
  { term: 'Remaining', detail: 'Amount still unpaid.' },
  { term: 'Due', detail: 'Due date, with overdue days.' },
  { term: 'Priority', detail: 'High, Med, Low, or Clear.' },
  { term: 'Status', detail: 'Open, Promised, Broken, Disputed, Needs check, Partial, Paid, or Resolved.' },
  { term: 'Promise', detail: 'Active, Broken, or —.' },
  { term: 'Dispute', detail: 'Open, Closed, or —.' },
  { term: 'Details', detail: 'Verified, or Needs check.' },
] as const

const invoiceFields = [
  { term: 'Paid', detail: 'Cash recorded, of the invoice amount.' },
  { term: 'Due', detail: 'The due date.' },
  { term: 'Promise', detail: 'Active, Broken, or —.' },
  { term: 'Dispute', detail: 'Open, Closed, or —.' },
  { term: 'Details', detail: 'Verified, or Needs check.' },
] as const

const actionGroups = [
  {
    label: 'Contact',
    actions: [
      { term: 'Record follow-up', detail: 'In the queue. A contact note only.' },
    ],
  },
  {
    label: 'Invoice details',
    actions: [
      { term: 'Flag details for review', detail: 'When no request is open.' },
      { term: 'Confirm details verified', detail: 'When a request is open.' },
      { term: 'Cancel details request', detail: 'When a request is open. Leaves it unverified.' },
    ],
  },
  {
    label: 'Promise',
    actions: [
      { term: 'Record promise', detail: 'When the invoice has no promise.' },
      { term: 'Update promise', detail: 'When one promise exists. Replaces that date.' },
      { term: 'Cancel promise', detail: 'When one promise exists. It stays in history.' },
    ],
  },
  {
    label: 'Dispute',
    actions: [
      { term: 'Open dispute', detail: 'When none is open, even if the promise is broken.' },
      { term: 'Update dispute', detail: 'When a dispute is open.' },
      { term: 'Cancel dispute', detail: 'When a dispute is open.' },
    ],
  },
  {
    label: 'Payment and resolve',
    actions: [
      { term: 'Record payment', detail: 'In the queue. A full payment leaves the queue and raises Paid total.' },
      { term: 'Resolve without payment', detail: 'In the queue. Leaves the queue. Paid total stays the same.' },
    ],
  },
  {
    label: 'Account manager',
    actions: [
      { term: 'Route to AM', detail: 'While a dispute is open. Its own action.' },
    ],
  },
] as const

export default function GuidePage() {
  return (
    <div className="briefing">
      <section className="brief-section" aria-labelledby="brief-dashboard">
        <h2 id="brief-dashboard">Dashboard</h2>
        <p className="brief-lead">These follow the due window.</p>
        <dl className="brief-grid">
          {dashboard.map(item => (
            <div key={item.term} className="brief-card">
              <dt>{item.term}</dt>
              <dd>{item.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="brief-section" aria-labelledby="brief-next">
        <h2 id="brief-next">Next up</h2>
        <ul className="brief-points">
          {nextUp.map(line => <li key={line}>{line}</li>)}
        </ul>
      </section>

      <section className="brief-section" aria-labelledby="brief-status">
        <h2 id="brief-status">Status</h2>
        <ul className="brief-legend">
          {statuses.map(item => (
            <li key={item.label}>
              <StatusTag label={item.label} tone={item.tone} />
              <span>{item.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="brief-section" aria-labelledby="brief-priority">
        <h2 id="brief-priority">Priority</h2>
        <ul className="brief-legend">
          {priorities.map(item => (
            <li key={item.tier}>
              <PriorityTag tier={item.tier} />
              <span>{item.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="brief-section" aria-labelledby="brief-columns">
        <h2 id="brief-columns">Queue columns</h2>
        <dl className="brief-grid">
          {columns.map(item => (
            <div key={item.term} className="brief-card">
              <dt>{item.term}</dt>
              <dd>{item.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="brief-section" aria-labelledby="brief-invoice">
        <h2 id="brief-invoice">On the invoice</h2>
        <p className="brief-lead">Click a row. These sit above the actions.</p>
        <dl className="brief-grid">
          {invoiceFields.map(item => (
            <div key={item.term} className="brief-card">
              <dt>{item.term}</dt>
              <dd>{item.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="brief-section" aria-labelledby="brief-actions">
        <h2 id="brief-actions">Drawer actions</h2>
        <p className="brief-lead">Every action lives in the drawer. Paid and resolved invoices have none.</p>
        <div className="brief-groups">
          {actionGroups.map(group => (
            <article key={group.label} className="brief-group" aria-label={group.label}>
              <h3>{group.label}</h3>
              <dl>
                {group.actions.map(action => (
                  <div key={action.term}>
                    <dt>{action.term}</dt>
                    <dd>{action.detail}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
