import { useEffect, useState } from 'react'
import {
  demoDay,
  disputeStatus,
  explainPriority,
  morningCapacity,
  overdueDays,
  priorityTier,
  promiseStatus,
  remaining,
  todaysThree,
  type Invoice,
  type PriorityTier,
} from '@domain/index.ts'
import { loadInvoices } from '../../api/invoices.ts'

function money(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function tierClass(tier: PriorityTier) {
  switch (tier) {
    case 'P0': return 'chip p0'
    case 'P1': return 'chip p1'
    case 'P2': return 'chip p2'
    case 'P3': return 'chip p3'
    default: {
      const _exhaustive: never = tier
      return _exhaustive
    }
  }
}

export default function DeskPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadInvoices()
      .then(items => {
        if (cancelled) return
        setInvoices(items)
        const picks = todaysThree(items)
        setSelectedId(picks[0]?.id ?? items[0]?.id ?? null)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed')
      })
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <main className="shell py-16">
        <p role="alert" className="text-danger font-semibold">{error}</p>
      </main>
    )
  }

  if (!invoices) {
    return (
      <main className="shell py-16">
        <p className="text-muted">Loading morning desk…</p>
      </main>
    )
  }

  const picks = todaysThree(invoices)
  const queue = [...invoices].sort((a, b) => {
    const order = { P0: 0, P1: 1, P2: 2, P3: 3 } as const
    return order[priorityTier(a)] - order[priorityTier(b)]
      || remaining(b) - remaining(a)
      || overdueDays(b) - overdueDays(a)
  })
  const selected = invoices.find(item => item.id === selectedId) ?? null

  return (
    <>
      <header className="topbar">
        <div className="shell flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="eyebrow">Finance operations</p>
            <h1 className="brand">Invoice Collections Desk</h1>
          </div>
          <p className="text-sm font-medium text-muted">Demo day {demoDay} · Morning capacity {morningCapacity}</p>
        </div>
      </header>

      <main className="shell grid gap-6 py-8">
        <section aria-labelledby="todays-three" className="panel p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">This morning</p>
              <h2 id="todays-three" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Today’s {morningCapacity}
              </h2>
              <p className="mt-1 max-w-2xl text-muted">
                Explainable priority tiers — not scores. Work these follow-ups first.
              </p>
            </div>
            <p className="text-sm font-semibold text-brand">{picks.length} of {morningCapacity} slots</p>
          </div>
          {picks.length === 0 ? (
            <p className="rounded-lg bg-brand-soft px-4 py-3 font-medium text-brand">No morning follow-ups. Queue is clear or waiting.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-3">
              {picks.map(invoice => {
                const explanation = explainPriority(invoice)
                return (
                  <li key={invoice.id}>
                    <button
                      type="button"
                      className="pick w-full rounded-lg"
                      aria-current={selectedId === invoice.id}
                      onClick={() => setSelectedId(invoice.id)}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-display text-lg font-bold text-ink">{invoice.code}</span>
                        <span className={tierClass(explanation.tier)}>{explanation.tier}</span>
                      </div>
                      <p className="text-sm font-semibold text-ink">{money(remaining(invoice))} remaining</p>
                      <p className="text-sm text-muted">{explanation.reason}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.2fr)]">
          <section aria-labelledby="queue-heading" className="panel overflow-hidden">
            <div className="border-b border-border px-4 py-4 sm:px-5">
              <h2 id="queue-heading" className="font-display text-xl font-bold">Queue</h2>
              <p className="mt-1 text-sm text-muted">All invoices with priority tiers. Read-only in this slice.</p>
            </div>
            <ul className="divide-y divide-border" role="list">
              {queue.map(invoice => {
                const tier = priorityTier(invoice)
                return (
                  <li key={invoice.id}>
                    <button
                      type="button"
                      className="queue-row"
                      aria-current={selectedId === invoice.id}
                      onClick={() => setSelectedId(invoice.id)}
                    >
                      <span className="grid size-9 place-items-center rounded-md bg-[#e7eee9] text-sm font-bold text-brand">
                        {invoice.code.slice(0, 1)}
                      </span>
                      <span className="grid text-left">
                        <span className="font-semibold">{invoice.code} · {invoice.customer}</span>
                        <span className="text-sm text-muted">{overdueDays(invoice)}d overdue · {money(remaining(invoice))}</span>
                      </span>
                      <span className={tierClass(tier)}>{tier}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section aria-labelledby="detail-heading" className="panel detail p-5 sm:p-6">
            {selected ? (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <p className="eyebrow">Invoice</p>
                    <h2 id="detail-heading" className="font-display text-3xl font-bold tracking-tight">{selected.code}</h2>
                    <p className="mt-1 text-muted">{selected.customer}</p>
                  </div>
                  <span className={tierClass(priorityTier(selected))}>{priorityTier(selected)}</span>
                </div>
                <p className="mb-4 max-w-xl text-ink">{explainPriority(selected).reason}</p>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt>Remaining</dt>
                    <dd>{money(remaining(selected))} <span className="font-normal text-muted">of {money(selected.amount)}</span></dd>
                  </div>
                  <div>
                    <dt>Overdue</dt>
                    <dd>{overdueDays(selected)} days</dd>
                  </div>
                  <div>
                    <dt>Promise</dt>
                    <dd>{promiseStatus(selected)}</dd>
                  </div>
                  <div>
                    <dt>Dispute</dt>
                    <dd>{disputeStatus(selected)}</dd>
                  </div>
                  <div>
                    <dt>Invoice accuracy</dt>
                    <dd>{selected.invoiceAccuracy}</dd>
                  </div>
                  <div>
                    <dt>Account manager</dt>
                    <dd>{selected.accountManager}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt>Follow-ups</dt>
                    <dd>{selected.followUps.length === 0 ? 'None recorded' : `${selected.followUps.length} on file`}</dd>
                  </div>
                </dl>
                <p className="mt-5 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted">
                  Actions (follow-up, promise, payment, resolve) land in later tickets. This slice is read-only.
                </p>
              </>
            ) : (
              <p className="text-muted">Select an invoice from Today’s 3 or the queue.</p>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
